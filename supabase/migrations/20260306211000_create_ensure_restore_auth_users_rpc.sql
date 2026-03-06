-- Garante auth.users/auth.identities mínimos para restore de perfis

CREATE OR REPLACE FUNCTION public.ensure_restore_auth_users(profiles_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_item jsonb;
  profile_id uuid;
  profile_email text;
  profile_name text;
  profile_role text;
  profile_phone text;
  created_users integer := 0;
  created_identities integer := 0;
  now_ts timestamptz := now();
BEGIN
  IF jsonb_typeof(profiles_payload) <> 'array' THEN
    RAISE EXCEPTION 'profiles_payload must be an array';
  END IF;

  FOR profile_item IN
    SELECT value
    FROM jsonb_array_elements(profiles_payload)
  LOOP
    profile_id := NULLIF(profile_item->>'id', '')::uuid;
    profile_email := NULLIF(trim(profile_item->>'email'), '');
    profile_name := NULLIF(trim(profile_item->>'full_name'), '');
    profile_role := NULLIF(trim(profile_item->>'role'), '');
    profile_phone := NULLIF(trim(profile_item->>'phone'), '');

    IF profile_id IS NULL THEN
      CONTINUE;
    END IF;

    IF profile_email IS NULL THEN
      profile_email := profile_id::text || '@restored.local';
    END IF;

    INSERT INTO auth.users (
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      profile_id,
      'authenticated',
      'authenticated',
      profile_email,
      '$2a$10$4rsYx57AK8M8oZ7sA2fYgOyD0sNehJIKBNB1LsYpe3K5PAh8x6n4W',
      now_ts,
      now_ts,
      jsonb_build_object(
        'provider', 'email',
        'providers', jsonb_build_array('email'),
        'restored_role', profile_role
      ),
      jsonb_strip_nulls(
        jsonb_build_object(
          'full_name', profile_name,
          'phone', profile_phone,
          'restored_from_backup', true
        )
      ),
      now_ts,
      now_ts
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      updated_at = now_ts,
      raw_user_meta_data = COALESCE(auth.users.raw_user_meta_data, '{}'::jsonb) || EXCLUDED.raw_user_meta_data,
      raw_app_meta_data = COALESCE(auth.users.raw_app_meta_data, '{}'::jsonb) || EXCLUDED.raw_app_meta_data;

    IF NOT EXISTS (
      SELECT 1
      FROM auth.identities
      WHERE user_id = profile_id
        AND provider = 'email'
    ) THEN
      INSERT INTO auth.identities (
        provider_id,
        user_id,
        identity_data,
        provider,
        created_at,
        updated_at,
        last_sign_in_at,
        email
      )
      VALUES (
        profile_email,
        profile_id,
        jsonb_strip_nulls(
          jsonb_build_object(
            'sub', profile_id::text,
            'email', profile_email,
            'email_verified', true,
            'phone_verified', false,
            'full_name', profile_name
          )
        ),
        'email',
        now_ts,
        now_ts,
        now_ts,
        profile_email
      );

      created_identities := created_identities + 1;
    END IF;
  END LOOP;

  SELECT COUNT(*)
  INTO created_users
  FROM auth.users
  WHERE id IN (
    SELECT NULLIF(value->>'id', '')::uuid
    FROM jsonb_array_elements(profiles_payload)
    WHERE NULLIF(value->>'id', '') IS NOT NULL
  );

  RETURN jsonb_build_object(
    'success', true,
    'users_available', created_users,
    'identities_created', created_identities
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_restore_auth_users(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_restore_auth_users(jsonb) TO authenticated;

COMMENT ON FUNCTION public.ensure_restore_auth_users(jsonb) IS
'Cria registros mínimos em auth.users e auth.identities para permitir restore de profiles com FK para auth.users.';

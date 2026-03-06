CREATE TABLE IF NOT EXISTS public.app_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton BOOLEAN NOT NULL DEFAULT TRUE UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  is_setup_complete BOOLEAN NOT NULL DEFAULT FALSE,
  current_step TEXT NOT NULL DEFAULT 'branding',
  claimed_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  installed_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace TEXT NOT NULL,
  key TEXT NOT NULL,
  value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(namespace, key)
);

CREATE TABLE IF NOT EXISTS public.app_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace TEXT NOT NULL,
  key TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  masked_value TEXT NOT NULL,
  updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_validated_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(namespace, key)
);

CREATE TABLE IF NOT EXISTS public.app_setup_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_setup_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read installation status" ON public.app_installations;
CREATE POLICY "Authenticated users can read installation status"
ON public.app_installations
FOR SELECT
TO authenticated
USING (TRUE);

DROP POLICY IF EXISTS "Authenticated users can read public app settings" ON public.app_settings;
CREATE POLICY "Authenticated users can read public app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (is_public = TRUE);

INSERT INTO public.app_installations (singleton)
VALUES (TRUE)
ON CONFLICT (singleton) DO NOTHING;

CREATE OR REPLACE FUNCTION public.touch_app_setup_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_app_installations_updated_at ON public.app_installations;
CREATE TRIGGER touch_app_installations_updated_at
BEFORE UPDATE ON public.app_installations
FOR EACH ROW
EXECUTE FUNCTION public.touch_app_setup_updated_at();

DROP TRIGGER IF EXISTS touch_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER touch_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.touch_app_setup_updated_at();

DROP TRIGGER IF EXISTS touch_app_secrets_updated_at ON public.app_secrets;
CREATE TRIGGER touch_app_secrets_updated_at
BEFORE UPDATE ON public.app_secrets
FOR EACH ROW
EXECUTE FUNCTION public.touch_app_setup_updated_at();

CREATE OR REPLACE FUNCTION public.claim_initial_installer(p_user_id UUID)
RETURNS public.app_installations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  installation public.app_installations;
BEGIN
  INSERT INTO public.app_installations (singleton)
  VALUES (TRUE)
  ON CONFLICT (singleton) DO NOTHING;

  UPDATE public.app_installations
  SET
    claimed_by = COALESCE(claimed_by, p_user_id),
    locked_at = COALESCE(locked_at, NOW()),
    status = CASE
      WHEN is_setup_complete = FALSE AND status = 'pending' THEN 'in_progress'
      ELSE status
    END,
    current_step = CASE
      WHEN is_setup_complete = FALSE AND current_step IS NULL THEN 'branding'
      ELSE current_step
    END,
    updated_at = NOW()
  WHERE singleton = TRUE
    AND is_setup_complete = FALSE
    AND (claimed_by IS NULL OR claimed_by = p_user_id)
  RETURNING * INTO installation;

  IF installation.id IS NULL THEN
    SELECT * INTO installation
    FROM public.app_installations
    WHERE singleton = TRUE
    LIMIT 1;
  END IF;

  RETURN installation;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_app_setup(p_user_id UUID, p_step TEXT DEFAULT 'completed')
RETURNS public.app_installations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  installation public.app_installations;
BEGIN
  UPDATE public.app_installations
  SET
    status = 'completed',
    is_setup_complete = TRUE,
    current_step = p_step,
    installed_by = p_user_id,
    claimed_by = COALESCE(claimed_by, p_user_id),
    completed_at = NOW(),
    updated_at = NOW()
  WHERE singleton = TRUE
    AND (claimed_by IS NULL OR claimed_by = p_user_id OR installed_by = p_user_id)
  RETURNING * INTO installation;

  RETURN installation;
END;
$$;

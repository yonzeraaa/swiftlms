-- Migration: Create RPC function to get last_sign_in_at for specific users

CREATE OR REPLACE FUNCTION public.get_last_sign_in_for_users(user_ids uuid[])
RETURNS TABLE (id uuid, last_sign_in_at timestamptz)
LANGUAGE sql
SECURITY DEFINER -- IMPORTANT: Allows the function to query auth.users
AS $$
  SELECT
    u.id,
    u.last_sign_in_at
  FROM auth.users u
  WHERE u.id = ANY(user_ids);
$$;

-- Grant execute permission to the authenticated role (or service_role if preferred)
-- Authenticated users (like admin calling the edge function) need to be able to call this.
GRANT EXECUTE ON FUNCTION public.get_last_sign_in_for_users(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_last_sign_in_for_users(uuid[]) TO service_role;
-- Migration: Create RPC function to fetch recent activity with admin profiles

CREATE OR REPLACE FUNCTION public.get_recent_activity_with_profiles(limit_count integer DEFAULT 15)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    action_type text,
    target_id uuid,
    target_type text,
    details jsonb,
    created_at timestamptz,
    admin_email text,
    admin_full_name text
)
LANGUAGE sql
STABLE -- Function only reads data
AS $$
  SELECT
    al.id,
    al.user_id,
    al.action_type,
    al.target_id,
    al.target_type,
    al.details,
    al.created_at,
    p.email AS admin_email,
    p.full_name AS admin_full_name
  FROM
    public.activity_log al
  LEFT JOIN
    public.profiles p ON al.user_id = p.id -- Join based on the FK
  ORDER BY
    al.created_at DESC
  LIMIT limit_count;
$$;

-- Grant execute permission to authenticated users (RLS on tables will still apply if needed)
GRANT EXECUTE ON FUNCTION public.get_recent_activity_with_profiles(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_activity_with_profiles(integer) TO service_role;
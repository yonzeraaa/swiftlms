-- Migration: Create activity_log table

-- 1. Create the table
CREATE TABLE public.activity_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Admin who performed the action (SET NULL if admin deleted)
    action_type text NOT NULL, -- e.g., 'course_created', 'user_frozen', 'lesson_deleted'
    target_id uuid NULL, -- Optional ID of the entity affected (course, user, lesson, etc.)
    target_type text NULL, -- Optional type of the entity ('course', 'user', 'lesson')
    details jsonb NULL, -- Optional extra details (e.g., old/new values, target name)
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add indexes for efficient querying
CREATE INDEX idx_activity_log_created_at ON public.activity_log (created_at DESC);
CREATE INDEX idx_activity_log_user_id ON public.activity_log (user_id);
CREATE INDEX idx_activity_log_action_type ON public.activity_log (action_type);

-- 3. Add comments
COMMENT ON TABLE public.activity_log IS 'Records significant actions performed within the application, primarily by administrators.';
COMMENT ON COLUMN public.activity_log.user_id IS 'The user who performed the action.';
COMMENT ON COLUMN public.activity_log.action_type IS 'Identifier for the type of action performed.';
COMMENT ON COLUMN public.activity_log.target_id IS 'Identifier of the primary entity affected by the action.';
COMMENT ON COLUMN public.activity_log.target_type IS 'Type of the primary entity affected by the action.';
COMMENT ON COLUMN public.activity_log.details IS 'Additional JSON details about the action.';
COMMENT ON COLUMN public.activity_log.created_at IS 'Timestamp when the action was logged.';

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
-- Allow admins to read all activity logs
CREATE POLICY "Allow admins to select all activity logs"
ON public.activity_log
FOR SELECT
USING (public.is_admin(auth.uid())); -- Assumes is_admin function exists

-- Allow service_role (e.g., from Edge Functions) to insert logs
-- Note: Direct insertion from the frontend by admins might be restricted
-- depending on security requirements. Using a function is often safer.
CREATE POLICY "Allow service_role to insert activity logs"
ON public.activity_log
FOR INSERT
WITH CHECK (true); -- Allows insertion if called by service_role

-- Optional: Allow admins to insert directly (if not using a dedicated function)
/*
CREATE POLICY "Allow admins to insert their own activity logs"
ON public.activity_log
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()) AND user_id = auth.uid());
*/

-- 6. Grant permissions
-- Grant SELECT to authenticated users (admins will be filtered by RLS)
GRANT SELECT ON TABLE public.activity_log TO authenticated;
-- Grant INSERT to service_role (for functions)
GRANT INSERT ON TABLE public.activity_log TO service_role;
-- Grant necessary usage for the sequence if not using UUIDs (not needed here)

-- Ensure the is_admin function exists (defined in a previous migration)
-- and is configured correctly.

-- Migration: Revert RLS changes allowing admin read all student data

-- 1. Revert Enrollments Read Policy
-- Drop the policy allowing admin read all
DROP POLICY IF EXISTS "Allow user read own enrollments or admin read all" ON public.enrollments;

-- Recreate the policy allowing individual read access OR admin read access
-- (This assumes admins might need to read all enrollments elsewhere, e.g., AdminEnrollmentsPage)
CREATE POLICY "Allow individual read access or admin"
ON public.enrollments
FOR SELECT
USING (
    auth.uid() = user_id OR public.is_admin(auth.uid())
);


-- 2. Revert Lesson Views Read Policy
-- Drop the policy allowing admin read all
DROP POLICY IF EXISTS "Allow user read own lesson views or admin read all" ON public.lesson_views;

-- Recreate the policy allowing only individual read access
CREATE POLICY "Allow users to select their own lesson views"
ON public.lesson_views
FOR SELECT
USING (("auth"."uid"() = "user_id"));
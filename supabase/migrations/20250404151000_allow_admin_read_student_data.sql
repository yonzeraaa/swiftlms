-- Migration: Allow Admins to Read Student-Specific Data (Enrollments, Lesson Views)

-- 1. Update Enrollments Read Policy
-- Drop existing policy restricting read to own user ID
DROP POLICY IF EXISTS "Allow individual read access" ON public.enrollments;
DROP POLICY IF EXISTS "Allow individual read access on enrollments" ON public.enrollments; -- Drop potential duplicate name
DROP POLICY IF EXISTS "Allow admin read access" ON public.enrollments; -- Drop admin-only read policy if exists

-- Create new policy allowing own user OR admin to read
CREATE POLICY "Allow user read own enrollments or admin read all"
ON public.enrollments
FOR SELECT
USING (
    auth.uid() = user_id OR public.is_admin(auth.uid())
);


-- 2. Update Lesson Views Read Policy
-- Drop existing policy restricting read to own user ID
DROP POLICY IF EXISTS "Allow users to select their own lesson views" ON public.lesson_views;

-- Create new policy allowing own user OR admin to read
CREATE POLICY "Allow user read own lesson views or admin read all"
ON public.lesson_views
FOR SELECT
USING (
    auth.uid() = user_id OR public.is_admin(auth.uid())
);

-- Note: The INSERT policy for lesson_views remains unchanged (users can only insert their own views).
-- Note: Admin full access policies on other tables already grant necessary read permissions.
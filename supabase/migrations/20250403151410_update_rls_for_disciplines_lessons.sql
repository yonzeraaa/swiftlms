-- Migration: Update RLS policies for disciplines and lessons

-- 1. Update Student Read Policy for Disciplines
-- Drop the existing policy first
DROP POLICY IF EXISTS "Allow enrolled students read access on disciplines" ON public.disciplines;

-- Create the new policy using the course_disciplines junction table
CREATE POLICY "Allow enrolled students read access on disciplines"
ON public.disciplines
FOR SELECT
USING (
    -- Admins can read all
    public.is_admin(auth.uid())
    OR
    -- Students can read disciplines linked to courses they are enrolled in
    EXISTS (
        SELECT 1
        FROM public.course_disciplines cd
        JOIN public.enrollments e ON cd.course_id = e.course_id
        WHERE cd.discipline_id = disciplines.id -- Link to the current discipline row
          AND e.user_id = auth.uid()
    )
);

-- 2. Update Student Read Policy for Lessons
-- Drop the existing policy first
DROP POLICY IF EXISTS "Allow enrolled students read access on lessons" ON public.lessons;

-- Create the new policy using the course_disciplines junction table
CREATE POLICY "Allow enrolled students read access on lessons"
ON public.lessons
FOR SELECT
USING (
    -- Admins can read all
    public.is_admin(auth.uid())
    OR
    -- Students can read lessons belonging to disciplines linked to courses they are enrolled in
    EXISTS (
        SELECT 1
        FROM public.course_disciplines cd
        JOIN public.enrollments e ON cd.course_id = e.course_id
        WHERE cd.discipline_id = lessons.discipline_id -- Link via the lesson's discipline_id
          AND e.user_id = auth.uid()
    )
);

-- Note: Admin policies for disciplines and lessons likely don't need changes
-- as they usually rely on the is_admin() check, not the course_id column.
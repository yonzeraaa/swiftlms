-- Migration: Update RLS policies for lessons table

-- 1. Update Student Read Policy for Lessons
-- Drop the existing policy first (ensure the name matches your previous migration)
DROP POLICY IF EXISTS "Allow enrolled students read access on lessons" ON public.lessons;

-- Create the new policy using the discipline_lessons and course_disciplines junction tables
CREATE POLICY "Allow enrolled students read access on lessons"
ON public.lessons
FOR SELECT
USING (
    -- Admins can read all
    public.is_admin(auth.uid())
    OR
    -- Students can read lessons linked to disciplines linked to courses they are enrolled in
    EXISTS (
        SELECT 1
        FROM public.discipline_lessons dl -- Start from the lesson's link to disciplines
        JOIN public.course_disciplines cd ON dl.discipline_id = cd.discipline_id -- Link discipline to courses
        JOIN public.enrollments e ON cd.course_id = e.course_id -- Link course to enrollments
        WHERE dl.lesson_id = lessons.id -- Match the current lesson row
          AND e.user_id = auth.uid() -- Check if the current user is enrolled
    )
);

-- Note: Admin policies for lessons likely don't need changes
-- as they usually rely on the is_admin() check.
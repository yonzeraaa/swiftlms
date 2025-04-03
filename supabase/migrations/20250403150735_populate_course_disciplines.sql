-- Migration: Populate course_disciplines from existing disciplines.course_id

-- Ensure this runs *after* the course_disciplines table is created
-- and *before* the disciplines.course_id column is dropped.

INSERT INTO public.course_disciplines (course_id, discipline_id)
SELECT d.course_id, d.id
FROM public.disciplines d
WHERE d.course_id IS NOT NULL
-- Optional: Add ON CONFLICT DO NOTHING if there's a chance of duplicates,
-- though the previous structure shouldn't allow this.
-- ON CONFLICT (course_id, discipline_id) DO NOTHING;

-- Note: No data is deleted from the disciplines table here.
-- The course_id column will be dropped in the next migration step.
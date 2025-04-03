-- Migration: Populate discipline_lessons from existing lessons.discipline_id

-- Ensure this runs *after* the discipline_lessons table is created
-- and *before* the lessons.discipline_id column is dropped.

INSERT INTO public.discipline_lessons (discipline_id, lesson_id)
SELECT l.discipline_id, l.id
FROM public.lessons l
WHERE l.discipline_id IS NOT NULL
-- Optional: Add ON CONFLICT DO NOTHING if there's a chance of duplicates,
-- though the previous structure shouldn't allow this.
ON CONFLICT (discipline_id, lesson_id) DO NOTHING;

-- Note: No data is deleted from the lessons table here.
-- The discipline_id column will be dropped in the next migration step.
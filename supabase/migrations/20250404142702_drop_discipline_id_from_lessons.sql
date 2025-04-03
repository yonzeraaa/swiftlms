-- Migration: Drop discipline_id column and constraint from lessons table

-- Ensure this runs *after* the discipline_lessons table is created and populated.

-- 1. Drop the foreign key constraint
-- Note: Constraint name might vary if not explicitly named 'lessons_discipline_id_fkey' initially.
-- Check your initial schema or pgAdmin if this fails.
ALTER TABLE public.lessons
DROP CONSTRAINT IF EXISTS lessons_discipline_id_fkey;

-- 2. Drop the discipline_id column
ALTER TABLE public.lessons
DROP COLUMN IF EXISTS discipline_id CASCADE; -- Add CASCADE to drop dependent objects

-- Note: Any RLS policies or functions that specifically referenced
-- lessons.discipline_id might need to be updated in separate steps
-- or reviewed after this migration. (We'll handle RLS updates next).
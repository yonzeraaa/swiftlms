-- Migration: Drop course_id column and constraint from disciplines table

-- Ensure this runs *after* the course_disciplines table is created and populated.

-- 1. Drop the foreign key constraint
-- Note: Constraint name might vary if not explicitly named 'disciplines_course_id_fkey' initially.
-- Check your initial schema or pgAdmin if this fails.
ALTER TABLE public.disciplines
DROP CONSTRAINT IF EXISTS disciplines_course_id_fkey;

-- 2. Drop the course_id column
ALTER TABLE public.disciplines
DROP COLUMN IF EXISTS course_id CASCADE; -- Add CASCADE to drop dependent objects

-- Note: Any RLS policies or functions that specifically referenced
-- disciplines.course_id might need to be updated in separate steps
-- or reviewed after this migration.
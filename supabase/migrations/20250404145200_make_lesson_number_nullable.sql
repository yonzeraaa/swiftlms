-- Migration: Make lesson number nullable

-- Make the 'number' column nullable in the 'lessons' table
ALTER TABLE public.lessons
ALTER COLUMN "number" DROP NOT NULL;

-- Note: We are not removing the column entirely, just making it optional.
-- Existing numbers will be kept, but new lessons can be created without one.
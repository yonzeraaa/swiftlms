-- Migration: Make discipline number nullable

-- Make the 'number' column nullable in the 'disciplines' table
ALTER TABLE public.disciplines
ALTER COLUMN "number" DROP NOT NULL;

-- Note: Existing numbers will be kept, but new disciplines can be created without one.
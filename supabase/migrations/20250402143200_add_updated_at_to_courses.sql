-- Migration: Add updated_at column to courses table

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;

-- Ensure the trigger function exists (it should from the initial schema)
-- CREATE OR REPLACE FUNCTION public.handle_updated_at()...

-- Ensure the trigger is attached (it should be from the initial schema)
-- CREATE OR REPLACE TRIGGER handle_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- No need to redefine the function or re-attach the trigger if they already exist.
-- This migration just ensures the column the trigger needs is present.
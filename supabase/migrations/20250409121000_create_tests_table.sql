-- supabase/migrations/20250409121000_create_tests_table.sql

CREATE TABLE public.tests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    discipline_id uuid NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
    name text NOT NULL,
    pdf_storage_path text, -- Path in Supabase Storage
    num_questions integer NOT NULL CHECK (num_questions > 0),
    min_passing_grade integer NOT NULL CHECK (min_passing_grade >= 0 AND min_passing_grade <= 100),
    max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
    correct_answers jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

-- Policies (Example: Admins can do everything, authenticated users can read)
-- TODO: Refine policies later based on specific roles (admin, student)
CREATE POLICY "Allow admin full access" ON public.tests
    FOR ALL
    USING (true); -- Replace with actual role check later

CREATE POLICY "Allow authenticated users read access" ON public.tests
    FOR SELECT
    USING (auth.role() = 'authenticated'); -- Needs refinement: students should only see tests for their enrolled disciplines

-- Trigger to update 'updated_at' timestamp
-- Ensure the moddatetime extension is enabled in your Supabase project:
-- CREATE EXTENSION IF NOT EXISTS moddatetime;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.tests
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime (updated_at);

COMMENT ON COLUMN public.tests.pdf_storage_path IS 'Path to the test PDF file within Supabase Storage.';
COMMENT ON COLUMN public.tests.correct_answers IS 'JSON object storing correct answers, e.g., {"1": "A", "2": "C"}.';
COMMENT ON COLUMN public.tests.min_passing_grade IS 'Minimum percentage score required to pass the test (0-100).';
-- supabase/migrations/20250409121100_create_student_test_attempts_table.sql

CREATE TABLE public.student_test_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    attempt_number integer NOT NULL CHECK (attempt_number > 0),
    answers jsonb, -- Store student's answers, e.g., {"1": "C", "2": "B"}
    score integer CHECK (score >= 0 AND score <= 100), -- Percentage score
    submitted_at timestamptz NOT NULL DEFAULT now(),

    -- Ensure a student cannot have the same attempt number twice for the same test
    CONSTRAINT unique_student_test_attempt UNIQUE (test_id, user_id, attempt_number)
);

-- Add indexes for faster lookups
CREATE INDEX idx_student_test_attempts_test_id ON public.student_test_attempts(test_id);
CREATE INDEX idx_student_test_attempts_user_id ON public.student_test_attempts(user_id);
CREATE INDEX idx_student_test_attempts_test_user ON public.student_test_attempts(test_id, user_id);


-- Enable Row Level Security
ALTER TABLE public.student_test_attempts ENABLE ROW LEVEL SECURITY;

-- Policies (Example: Users can manage their own attempts, Admins can do everything)
-- TODO: Refine policies later
CREATE POLICY "Allow users manage own attempts" ON public.student_test_attempts
    FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Allow admin full access" ON public.student_test_attempts
    FOR ALL
    USING (true); -- Replace with actual role check later


COMMENT ON COLUMN public.student_test_attempts.answers IS 'JSON object storing the answers submitted by the student for this attempt.';
COMMENT ON COLUMN public.student_test_attempts.score IS 'Percentage score achieved by the student in this attempt (0-100).';
COMMENT ON COLUMN public.student_test_attempts.attempt_number IS 'The sequential number of this attempt for the specific test by the student.';
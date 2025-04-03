-- Migration: Create course_disciplines junction table

-- 1. Create the table
CREATE TABLE public.course_disciplines (
    course_id uuid NOT NULL,
    discipline_id uuid NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    -- Optional: Add an order column if discipline order needs to be specific per course
    -- order_in_course smallint DEFAULT 0,

    -- Constraints
    CONSTRAINT course_disciplines_pkey PRIMARY KEY (course_id, discipline_id),
    CONSTRAINT course_disciplines_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE,
    CONSTRAINT course_disciplines_discipline_id_fkey FOREIGN KEY (discipline_id) REFERENCES public.disciplines(id) ON DELETE CASCADE
);

-- 2. Add indexes for efficient lookups
CREATE INDEX idx_course_disciplines_course_id ON public.course_disciplines (course_id);
CREATE INDEX idx_course_disciplines_discipline_id ON public.course_disciplines (discipline_id);

-- 3. Add comments
COMMENT ON TABLE public.course_disciplines IS 'Junction table linking courses and disciplines (many-to-many).';
COMMENT ON COLUMN public.course_disciplines.course_id IS 'Foreign key referencing the course.';
COMMENT ON COLUMN public.course_disciplines.discipline_id IS 'Foreign key referencing the discipline.';
COMMENT ON COLUMN public.course_disciplines.created_at IS 'Timestamp when the link was created.';
-- COMMENT ON COLUMN public.course_disciplines.order_in_course IS 'Optional: Order of the discipline within a specific course.';

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.course_disciplines ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
-- Allow admins full access
CREATE POLICY "Allow admin full access on course_disciplines"
ON public.course_disciplines
FOR ALL
USING (public.is_admin(auth.uid())) -- Assumes is_admin function exists
WITH CHECK (public.is_admin(auth.uid()));

-- Allow enrolled students to read links for their courses
CREATE POLICY "Allow enrolled students read access on course_disciplines"
ON public.course_disciplines
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.enrollments e
        WHERE e.user_id = auth.uid() AND e.course_id = course_disciplines.course_id
    )
);

-- 6. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.course_disciplines TO service_role;
GRANT SELECT ON TABLE public.course_disciplines TO authenticated; -- RLS handles specific access
-- Grant INSERT/UPDATE/DELETE to authenticated if admins will manage directly (RLS restricts)
-- GRANT INSERT, UPDATE, DELETE ON TABLE public.course_disciplines TO authenticated;
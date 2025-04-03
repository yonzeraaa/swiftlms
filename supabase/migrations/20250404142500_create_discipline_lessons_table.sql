-- Migration: Create discipline_lessons junction table

-- 1. Create the junction table
CREATE TABLE public.discipline_lessons (
    discipline_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    -- Optional: Add an order column if lesson order needs to be specific per discipline
    -- order_in_discipline smallint DEFAULT 0,

    -- Constraints
    CONSTRAINT discipline_lessons_pkey PRIMARY KEY (discipline_id, lesson_id),
    CONSTRAINT discipline_lessons_discipline_id_fkey FOREIGN KEY (discipline_id) REFERENCES public.disciplines(id) ON DELETE CASCADE,
    CONSTRAINT discipline_lessons_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE
);

-- 2. Add indexes for efficient lookups
CREATE INDEX idx_discipline_lessons_discipline_id ON public.discipline_lessons (discipline_id);
CREATE INDEX idx_discipline_lessons_lesson_id ON public.discipline_lessons (lesson_id);

-- 3. Add comments
COMMENT ON TABLE public.discipline_lessons IS 'Junction table linking disciplines and lessons (many-to-many).';
COMMENT ON COLUMN public.discipline_lessons.discipline_id IS 'Foreign key referencing the discipline.';
COMMENT ON COLUMN public.discipline_lessons.lesson_id IS 'Foreign key referencing the lesson.';
COMMENT ON COLUMN public.discipline_lessons.created_at IS 'Timestamp when the link was created.';
-- COMMENT ON COLUMN public.discipline_lessons.order_in_discipline IS 'Optional: Order of the lesson within a specific discipline.';

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.discipline_lessons ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
-- Allow admins full access
CREATE POLICY "Allow admin full access on discipline_lessons"
ON public.discipline_lessons
FOR ALL
USING (public.is_admin(auth.uid())) -- Assumes is_admin function exists
WITH CHECK (public.is_admin(auth.uid()));

-- Allow enrolled students to read links for disciplines in their courses
CREATE POLICY "Allow enrolled students read access on discipline_lessons"
ON public.discipline_lessons
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.course_disciplines cd
        JOIN public.enrollments e ON cd.course_id = e.course_id
        WHERE e.user_id = auth.uid() AND cd.discipline_id = discipline_lessons.discipline_id
    )
);

-- 6. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.discipline_lessons TO service_role;
GRANT SELECT ON TABLE public.discipline_lessons TO authenticated; -- RLS handles specific access
-- Grant INSERT/UPDATE/DELETE to authenticated if admins will manage directly (RLS restricts)
-- GRANT INSERT, UPDATE, DELETE ON TABLE public.discipline_lessons TO authenticated;
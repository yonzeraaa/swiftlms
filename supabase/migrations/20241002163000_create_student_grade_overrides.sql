CREATE TABLE IF NOT EXISTS public.student_grade_overrides (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tests_average_override numeric(5,2),
    tests_weight numeric(4,2) DEFAULT 1 CHECK (tests_weight >= 0),
    tcc_grade_override numeric(5,2),
    tcc_weight numeric(4,2) DEFAULT 1 CHECK (tcc_weight >= 0),
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT student_grade_overrides_user_unique UNIQUE (user_id)
);

CREATE OR REPLACE FUNCTION public.update_student_grade_overrides_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_student_grade_overrides_updated_at ON public.student_grade_overrides;
CREATE TRIGGER trg_student_grade_overrides_updated_at
BEFORE UPDATE ON public.student_grade_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_student_grade_overrides_updated_at();

ALTER TABLE public.student_grade_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read grade overrides" ON public.student_grade_overrides;
DROP POLICY IF EXISTS "Admin manage grade overrides" ON public.student_grade_overrides;
DROP POLICY IF EXISTS "Admin update grade overrides" ON public.student_grade_overrides;
DROP POLICY IF EXISTS "Admin delete grade overrides" ON public.student_grade_overrides;

CREATE POLICY "Read grade overrides" ON public.student_grade_overrides
FOR SELECT
USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "Admin manage grade overrides" ON public.student_grade_overrides
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "Admin update grade overrides" ON public.student_grade_overrides
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "Admin delete grade overrides" ON public.student_grade_overrides
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Limpeza ampla do sistema preservando instalação e admins

CREATE OR REPLACE FUNCTION public.clear_application_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_profiles integer := 0;
BEGIN
  TRUNCATE TABLE
    public.activity_logs,
    public.certificate_requests,
    public.certificate_requirements,
    public.certificates,
    public.course_reviews,
    public.enrollment_modules,
    public.enrollments,
    public.lesson_progress,
    public.student_grade_overrides,
    public.student_schedules,
    public.tcc_submissions,
    public.test_attempts,
    public.test_grades,
    public.test_answer_keys,
    public.tests,
    public.subject_lessons,
    public.module_subjects,
    public.course_subjects,
    public.lessons,
    public.course_modules,
    public.subjects,
    public.courses,
    public.excel_templates,
    public.certificate_templates,
    public.app_setup_audit
  RESTART IDENTITY CASCADE;

  DELETE FROM public.profiles
  WHERE COALESCE(role, 'student') <> 'admin';

  GET DIAGNOSTICS deleted_profiles = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'tables_cleared', 25,
    'profiles_deleted', deleted_profiles
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.clear_application_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_application_data() TO authenticated;

COMMENT ON FUNCTION public.clear_application_data() IS
'Limpa dados operacionais, conteúdo acadêmico, templates e auditoria, preservando configuração da instalação e perfis admin.';

-- Migration: Fix User Deletion RPCs
-- Date: 2025-11-11
-- Description: Update delete_user_completely and preview_user_deletion to reflect current schema

-- ============================================================================
-- 1. DROP existing functions
-- ============================================================================

DROP FUNCTION IF EXISTS public.preview_user_deletion(uuid);
DROP FUNCTION IF EXISTS public.delete_user_completely(uuid);

-- ============================================================================
-- 2. CREATE preview_user_deletion - Preview impact before deletion
-- ============================================================================

CREATE OR REPLACE FUNCTION public.preview_user_deletion(user_id_to_check uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  test_attempts_count int;
  lesson_progress_count int;
  certificates_count int;
  course_reviews_count int;
  enrollments_count int;
  activity_logs_count int;
  courses_as_instructor_count int;
  certificate_requests_count int;
  certificate_requirements_count int;
  excel_templates_count int;
  student_grade_overrides_count int;
  student_schedules_count int;
  tcc_submissions_as_author_count int;
  tcc_submissions_as_evaluator_count int;
  test_grades_count int;
  certificates_approved_by_count int;
  certificate_requests_processed_by_count int;
  total_records int;
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_id_to_check) THEN
    RETURN jsonb_build_object(
      'error', 'User not found',
      'user_id', user_id_to_check
    );
  END IF;

  -- Count records in each table
  SELECT COUNT(*) INTO test_attempts_count FROM test_attempts WHERE user_id = user_id_to_check;
  SELECT COUNT(*) INTO lesson_progress_count FROM lesson_progress WHERE user_id = user_id_to_check;
  SELECT COUNT(*) INTO certificates_count FROM certificates WHERE user_id = user_id_to_check;
  SELECT COUNT(*) INTO course_reviews_count FROM course_reviews WHERE user_id = user_id_to_check;
  SELECT COUNT(*) INTO enrollments_count FROM enrollments WHERE user_id = user_id_to_check;
  SELECT COUNT(*) INTO activity_logs_count FROM activity_logs WHERE user_id = user_id_to_check;
  SELECT COUNT(*) INTO courses_as_instructor_count FROM courses WHERE instructor_id = user_id_to_check;
  SELECT COUNT(*) INTO certificate_requests_count FROM certificate_requests WHERE user_id = user_id_to_check;
  SELECT COUNT(*) INTO certificate_requirements_count FROM certificate_requirements WHERE user_id = user_id_to_check;
  SELECT COUNT(*) INTO excel_templates_count FROM excel_templates WHERE created_by = user_id_to_check;
  SELECT COUNT(*) INTO student_grade_overrides_count FROM student_grade_overrides WHERE user_id = user_id_to_check;
  SELECT COUNT(*) INTO student_schedules_count FROM student_schedules WHERE user_id = user_id_to_check;
  SELECT COUNT(*) INTO tcc_submissions_as_author_count FROM tcc_submissions WHERE user_id = user_id_to_check;
  SELECT COUNT(*) INTO tcc_submissions_as_evaluator_count FROM tcc_submissions WHERE evaluated_by = user_id_to_check;
  SELECT COUNT(*) INTO test_grades_count FROM test_grades WHERE user_id = user_id_to_check;
  SELECT COUNT(*) INTO certificates_approved_by_count FROM certificates WHERE approved_by = user_id_to_check;
  SELECT COUNT(*) INTO certificate_requests_processed_by_count FROM certificate_requests WHERE processed_by = user_id_to_check;

  -- Calculate total
  total_records := test_attempts_count + lesson_progress_count + certificates_count +
                   course_reviews_count + enrollments_count + activity_logs_count +
                   certificate_requests_count + certificate_requirements_count +
                   excel_templates_count + student_grade_overrides_count +
                   student_schedules_count + tcc_submissions_as_author_count +
                   test_grades_count;

  -- Build result JSON
  result := jsonb_build_object(
    'user_id', user_id_to_check,
    'total_records_to_delete', total_records,
    'records_to_update', courses_as_instructor_count + tcc_submissions_as_evaluator_count +
                         certificates_approved_by_count + certificate_requests_processed_by_count,
    'breakdown', jsonb_build_object(
      'test_attempts', test_attempts_count,
      'lesson_progress', lesson_progress_count,
      'certificates', certificates_count,
      'course_reviews', course_reviews_count,
      'enrollments', enrollments_count,
      'activity_logs', activity_logs_count,
      'certificate_requests', certificate_requests_count,
      'certificate_requirements', certificate_requirements_count,
      'excel_templates', excel_templates_count,
      'student_grade_overrides', student_grade_overrides_count,
      'student_schedules', student_schedules_count,
      'tcc_submissions_as_author', tcc_submissions_as_author_count,
      'test_grades', test_grades_count
    ),
    'updates', jsonb_build_object(
      'courses_instructor_id_to_null', courses_as_instructor_count,
      'tcc_submissions_evaluated_by_to_null', tcc_submissions_as_evaluator_count,
      'certificates_approved_by_to_null', certificates_approved_by_count,
      'certificate_requests_processed_by_to_null', certificate_requests_processed_by_count
    )
  );

  RETURN result;
END;
$$;

-- ============================================================================
-- 3. CREATE delete_user_completely - Complete user deletion
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id_to_delete uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int := 0;
  result jsonb;
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_id_to_delete) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found',
      'user_id', user_id_to_delete
    );
  END IF;

  -- Start transaction
  BEGIN
    -- Step 1: Update foreign references to NULL (NO ACTION columns)
    -- These must be done first to avoid FK violations

    UPDATE certificates
    SET approved_by = NULL
    WHERE approved_by = user_id_to_delete;

    UPDATE certificate_requests
    SET processed_by = NULL
    WHERE processed_by = user_id_to_delete;

    UPDATE tcc_submissions
    SET evaluated_by = NULL
    WHERE evaluated_by = user_id_to_delete;

    UPDATE courses
    SET instructor_id = NULL
    WHERE instructor_id = user_id_to_delete;

    -- Step 2: Delete records (CASCADE columns will be auto-deleted)
    -- Order matters: delete children before parents where CASCADE doesn't apply

    -- Activity logs (for audit trail, delete explicitly)
    DELETE FROM activity_logs WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Certificate related
    DELETE FROM certificate_requirements WHERE user_id = user_id_to_delete;
    DELETE FROM certificate_requests WHERE user_id = user_id_to_delete;

    -- Excel templates created by user
    DELETE FROM excel_templates WHERE created_by = user_id_to_delete;

    -- Student data
    DELETE FROM student_grade_overrides WHERE user_id = user_id_to_delete;
    DELETE FROM student_schedules WHERE user_id = user_id_to_delete;
    DELETE FROM tcc_submissions WHERE user_id = user_id_to_delete;

    -- Course reviews
    DELETE FROM course_reviews WHERE user_id = user_id_to_delete;

    -- Test and lesson data (these have CASCADE but delete explicitly for clarity)
    DELETE FROM test_grades WHERE user_id = user_id_to_delete;
    DELETE FROM test_attempts WHERE user_id = user_id_to_delete;
    DELETE FROM lesson_progress WHERE user_id = user_id_to_delete;

    -- Certificates
    DELETE FROM certificates WHERE user_id = user_id_to_delete;

    -- Enrollments (will cascade to enrollment_modules via FK)
    DELETE FROM enrollments WHERE user_id = user_id_to_delete;

    -- Step 3: Delete profile (last step)
    DELETE FROM profiles WHERE id = user_id_to_delete;

    -- Build success response
    result := jsonb_build_object(
      'success', true,
      'user_id', user_id_to_delete,
      'message', 'User and all related data deleted successfully',
      'note', 'Auth user must be deleted separately via admin API'
    );

    RETURN result;

  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback happens automatically
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE,
        'user_id', user_id_to_delete
      );
  END;
END;
$$;

-- ============================================================================
-- 4. Grant permissions
-- ============================================================================

-- These functions are SECURITY DEFINER and should only be callable by authenticated users
-- The endpoint will verify admin permissions before calling
GRANT EXECUTE ON FUNCTION public.preview_user_deletion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_completely(uuid) TO authenticated;

-- ============================================================================
-- 5. Add comments for documentation
-- ============================================================================

COMMENT ON FUNCTION public.preview_user_deletion(uuid) IS
'Returns a preview of all records that will be affected by deleting a user. Shows counts per table and which records will be updated vs deleted.';

COMMENT ON FUNCTION public.delete_user_completely(uuid) IS
'Completely deletes a user and all related data from the database. Updates foreign references to NULL before deletion. Does NOT delete from auth.users - that must be done separately via admin API.';

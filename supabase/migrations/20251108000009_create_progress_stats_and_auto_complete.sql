-- ============================================================================
-- Função para buscar estatísticas de progresso do usuário
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_progress_stats(uuid);

CREATE OR REPLACE FUNCTION get_user_progress_stats(p_user_id uuid)
RETURNS TABLE (
  total_enrolled_courses integer,
  completed_courses integer,
  in_progress_courses integer,
  total_lessons integer,
  completed_lessons integer,
  total_hours_content numeric,
  hours_completed numeric,
  overall_progress numeric,
  current_streak integer,
  total_certificates integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_enrolled integer;
  v_completed integer;
  v_in_progress integer;
  v_total_lessons integer;
  v_completed_lessons integer;
  v_total_hours numeric;
  v_hours_completed numeric;
  v_overall_progress numeric;
  v_total_certificates integer;
BEGIN
  -- Contar cursos matriculados
  SELECT COUNT(*) INTO v_total_enrolled
  FROM enrollments
  WHERE user_id = p_user_id;

  -- Contar cursos concluídos
  SELECT COUNT(*) INTO v_completed
  FROM enrollments
  WHERE user_id = p_user_id
    AND status = 'completed';

  -- Contar cursos em progresso
  SELECT COUNT(*) INTO v_in_progress
  FROM enrollments
  WHERE user_id = p_user_id
    AND status != 'completed';

  -- Contar lições totais e completadas
  SELECT
    COALESCE(COUNT(DISTINCT l.id), 0),
    COALESCE(COUNT(DISTINCT CASE WHEN lp.is_completed = true THEN lp.lesson_id END), 0)
  INTO v_total_lessons, v_completed_lessons
  FROM enrollments e
  INNER JOIN course_modules cm ON cm.course_id = e.course_id
  INNER JOIN lessons l ON l.module_id = cm.id
  LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = p_user_id
  WHERE e.user_id = p_user_id;

  -- Calcular horas totais e horas completadas
  SELECT
    COALESCE(SUM(c.duration_hours), 0),
    COALESCE(SUM(c.duration_hours * (e.progress_percentage / 100.0)), 0)
  INTO v_total_hours, v_hours_completed
  FROM enrollments e
  INNER JOIN courses c ON c.id = e.course_id
  WHERE e.user_id = p_user_id;

  -- Calcular progresso geral
  IF v_total_enrolled > 0 THEN
    SELECT AVG(progress_percentage) INTO v_overall_progress
    FROM enrollments
    WHERE user_id = p_user_id;
  ELSE
    v_overall_progress := 0;
  END IF;

  -- Contar certificados aprovados
  SELECT COUNT(*) INTO v_total_certificates
  FROM certificates
  WHERE user_id = p_user_id
    AND approval_status = 'approved';

  RETURN QUERY SELECT
    v_total_enrolled,
    v_completed,
    v_in_progress,
    v_total_lessons,
    v_completed_lessons,
    v_total_hours,
    v_hours_completed,
    COALESCE(v_overall_progress, 0),
    0, -- current_streak (pode ser implementado depois)
    v_total_certificates;
END;
$$;

COMMENT ON FUNCTION get_user_progress_stats IS
'Retorna estatísticas completas de progresso do usuário';

-- ============================================================================
-- Trigger para auto-completar enrollment quando progresso = 100%
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_complete_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se o progresso atingiu 100% e o status não é 'completed', atualiza
  IF NEW.progress_percentage >= 100 AND NEW.status != 'completed' THEN
    NEW.status := 'completed';
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_auto_complete_enrollment ON enrollments;

CREATE TRIGGER trigger_auto_complete_enrollment
  BEFORE UPDATE OF progress_percentage ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_enrollment();

COMMENT ON TRIGGER trigger_auto_complete_enrollment ON enrollments IS
'Automaticamente marca enrollment como completed quando progresso = 100%';

-- ============================================================================
-- Atualizar enrollments existentes com 100% para status 'completed'
-- ============================================================================

UPDATE enrollments
SET
  status = 'completed',
  completed_at = COALESCE(completed_at, now())
WHERE progress_percentage >= 100
  AND status != 'completed';

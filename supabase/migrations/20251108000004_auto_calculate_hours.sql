-- ============================================================================
-- Auto-cálculo de horas para cursos, módulos e disciplinas
-- ============================================================================
-- Sistema de distribuição igualitária de horas:
-- - Total do curso ÷ número de módulos = horas por módulo
-- - Horas do módulo ÷ número de disciplinas = horas por disciplina
-- ============================================================================

-- 1. Função para recalcular horas de um curso específico
-- ============================================================================
CREATE OR REPLACE FUNCTION recalculate_course_hours(p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_course_duration_hours integer;
  v_module_count integer;
  v_hours_per_module integer;
  v_module record;
  v_subject_count integer;
  v_hours_per_subject integer;
BEGIN
  -- Obter total de horas do curso
  SELECT duration_hours INTO v_course_duration_hours
  FROM courses
  WHERE id = p_course_id;

  -- Se curso não existe ou não tem horas, sair
  IF v_course_duration_hours IS NULL OR v_course_duration_hours = 0 THEN
    RETURN;
  END IF;

  -- Contar quantos módulos o curso tem
  SELECT COUNT(*) INTO v_module_count
  FROM course_modules
  WHERE course_id = p_course_id;

  -- Se não há módulos, sair
  IF v_module_count = 0 THEN
    RETURN;
  END IF;

  -- Calcular horas por módulo (divisão igualitária)
  v_hours_per_module := v_course_duration_hours / v_module_count;

  -- Para cada módulo do curso
  FOR v_module IN
    SELECT id FROM course_modules WHERE course_id = p_course_id
  LOOP
    -- Contar quantas disciplinas o módulo tem
    SELECT COUNT(*) INTO v_subject_count
    FROM module_subjects
    WHERE module_id = v_module.id;

    -- Se módulo não tem disciplinas, definir total_hours como horas_por_módulo
    IF v_subject_count = 0 THEN
      UPDATE course_modules
      SET total_hours = v_hours_per_module
      WHERE id = v_module.id;
    ELSE
      -- Calcular horas por disciplina (divisão igualitária dentro do módulo)
      v_hours_per_subject := v_hours_per_module / v_subject_count;

      -- Atualizar horas de todas as disciplinas deste módulo
      UPDATE subjects
      SET hours = v_hours_per_subject
      WHERE id IN (
        SELECT subject_id
        FROM module_subjects
        WHERE module_id = v_module.id
      );

      -- Atualizar total_hours do módulo (será exatamente v_hours_per_module)
      UPDATE course_modules
      SET total_hours = v_hours_per_module
      WHERE id = v_module.id;
    END IF;
  END LOOP;
END;
$$;

-- 2. Trigger: Quando duration_hours do curso muda
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_recalculate_on_course_hours_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Só recalcular se duration_hours mudou
  IF (TG_OP = 'UPDATE' AND OLD.duration_hours IS DISTINCT FROM NEW.duration_hours) OR TG_OP = 'INSERT' THEN
    PERFORM recalculate_course_hours(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_hours_changed ON courses;
CREATE TRIGGER course_hours_changed
  AFTER INSERT OR UPDATE OF duration_hours ON courses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_on_course_hours_change();

-- 3. Trigger: Quando módulo é adicionado/removido de um curso
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_recalculate_on_module_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_course_hours(OLD.course_id);
    RETURN OLD;
  ELSE
    PERFORM recalculate_course_hours(NEW.course_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS course_modules_changed ON course_modules;
CREATE TRIGGER course_modules_changed
  AFTER INSERT OR DELETE ON course_modules
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_on_module_change();

-- 4. Trigger: Quando disciplina é adicionada/removida de um módulo
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_recalculate_on_subject_module_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_course_id uuid;
BEGIN
  -- Obter o course_id do módulo afetado
  IF TG_OP = 'DELETE' THEN
    SELECT course_id INTO v_course_id
    FROM course_modules
    WHERE id = OLD.module_id;
  ELSE
    SELECT course_id INTO v_course_id
    FROM course_modules
    WHERE id = NEW.module_id;
  END IF;

  -- Recalcular horas do curso
  IF v_course_id IS NOT NULL THEN
    PERFORM recalculate_course_hours(v_course_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS module_subjects_changed ON module_subjects;
CREATE TRIGGER module_subjects_changed
  AFTER INSERT OR DELETE ON module_subjects
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_on_subject_module_change();

-- ============================================================================
-- Recalcular horas de todos os cursos existentes
-- ============================================================================
DO $$
DECLARE
  v_course record;
BEGIN
  FOR v_course IN SELECT id FROM courses WHERE duration_hours > 0 LOOP
    PERFORM recalculate_course_hours(v_course.id);
  END LOOP;
END;
$$;

-- ============================================================================
-- Comentários e documentação
-- ============================================================================
COMMENT ON FUNCTION recalculate_course_hours IS
'Recalcula e distribui igualitariamente as horas de um curso entre seus módulos e disciplinas.
Total do curso ÷ módulos = horas/módulo. Horas do módulo ÷ disciplinas = horas/disciplina.';

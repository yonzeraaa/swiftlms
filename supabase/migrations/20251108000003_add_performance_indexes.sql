-- Migration: Adicionar índices de performance
-- Data: 2025-11-08
-- Descrição: Cria índices para otimizar queries frequentes no sistema de notas

-- ============================================================================
-- PART 1: Índices para test_attempts
-- ============================================================================

-- Índice composto para queries filtradas por user_id e data
-- Usado em: StudentGradesReport, relatórios com filtro de data
CREATE INDEX IF NOT EXISTS idx_test_attempts_user_date
ON test_attempts(user_id, submitted_at DESC NULLS LAST);

-- Índice para queries que buscam melhores tentativas por teste
CREATE INDEX IF NOT EXISTS idx_test_attempts_test_score
ON test_attempts(test_id, score DESC);

-- Índice para queries que buscam tentativas submetidas
CREATE INDEX IF NOT EXISTS idx_test_attempts_submitted
ON test_attempts(submitted_at DESC)
WHERE submitted_at IS NOT NULL;

-- ============================================================================
-- PART 2: Índices para test_grades
-- ============================================================================

-- Índice para queries que buscam notas por usuário
-- (Já foi criado na migração anterior, mas garantindo idempotência)
CREATE INDEX IF NOT EXISTS idx_test_grades_user_id
ON test_grades(user_id);

-- Índice para queries que buscam por test_id
CREATE INDEX IF NOT EXISTS idx_test_grades_test_id
ON test_grades(test_id);

-- Índice composto para queries que buscam melhores notas
CREATE INDEX IF NOT EXISTS idx_test_grades_user_best
ON test_grades(user_id, best_score DESC);

-- ============================================================================
-- PART 3: Índices para tests
-- ============================================================================

-- Índice para queries que buscam testes por subject_id
-- (Já foi criado na migração anterior, mas garantindo idempotência)
CREATE INDEX IF NOT EXISTS idx_tests_subject
ON tests(subject_id);

-- Índice para queries que buscam testes ativos
CREATE INDEX IF NOT EXISTS idx_tests_active
ON tests(is_active)
WHERE is_active = true;

-- Índice para queries que buscam testes por curso
CREATE INDEX IF NOT EXISTS idx_tests_course
ON tests(course_id);

-- ============================================================================
-- PART 4: Índices para tcc_submissions
-- ============================================================================

-- Índice composto para queries que buscam TCC por usuário e data
CREATE INDEX IF NOT EXISTS idx_tcc_submissions_user_date
ON tcc_submissions(user_id, evaluated_at DESC NULLS LAST);

-- Índice para queries que filtram por data de avaliação
CREATE INDEX IF NOT EXISTS idx_tcc_submissions_evaluated
ON tcc_submissions(evaluated_at DESC)
WHERE evaluated_at IS NOT NULL;

-- ============================================================================
-- PART 5: Índices para student_grade_overrides
-- ============================================================================

-- Índice único para user_id (usado em upserts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_grade_overrides_user
ON student_grade_overrides(user_id);

-- ============================================================================
-- PART 6: Índices para activity_logs (auditoria)
-- ============================================================================

-- Índice para queries que buscam logs por usuário e tipo
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_type
ON activity_logs(user_id, activity_type, created_at DESC);

-- Índice para queries que buscam logs por entidade
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity
ON activity_logs(entity_type, entity_id, created_at DESC);

-- ============================================================================
-- PART 7: Análise e documentação
-- ============================================================================

-- Comentários para documentação
COMMENT ON INDEX idx_test_attempts_user_date IS 'Otimiza queries de tentativas por usuário com filtro de data';
COMMENT ON INDEX idx_test_attempts_test_score IS 'Otimiza busca de melhores tentativas por teste';
COMMENT ON INDEX idx_test_grades_user_best IS 'Otimiza busca de melhores notas por usuário';
COMMENT ON INDEX idx_tests_active IS 'Otimiza busca de testes ativos';
COMMENT ON INDEX idx_tcc_submissions_user_date IS 'Otimiza busca de TCCs por usuário com ordenação por data';

-- ============================================================================
-- PART 8: Análise de performance (opcional, apenas log)
-- ============================================================================

DO $$
DECLARE
  ta_indexes INTEGER;
  tg_indexes INTEGER;
  tests_indexes INTEGER;
  tcc_indexes INTEGER;
BEGIN
  -- Contar índices criados por tabela
  SELECT COUNT(*) INTO ta_indexes
  FROM pg_indexes
  WHERE tablename = 'test_attempts';

  SELECT COUNT(*) INTO tg_indexes
  FROM pg_indexes
  WHERE tablename = 'test_grades';

  SELECT COUNT(*) INTO tests_indexes
  FROM pg_indexes
  WHERE tablename = 'tests';

  SELECT COUNT(*) INTO tcc_indexes
  FROM pg_indexes
  WHERE tablename = 'tcc_submissions';

  -- Log de verificação
  RAISE NOTICE 'Índices criados:';
  RAISE NOTICE '  test_attempts: % índices', ta_indexes;
  RAISE NOTICE '  test_grades: % índices', tg_indexes;
  RAISE NOTICE '  tests: % índices', tests_indexes;
  RAISE NOTICE '  tcc_submissions: % índices', tcc_indexes;

  RAISE NOTICE 'Migração de índices concluída com sucesso.';
END $$;

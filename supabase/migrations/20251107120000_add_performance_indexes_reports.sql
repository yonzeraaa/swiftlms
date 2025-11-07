-- Migration: Adiciona índices críticos para otimizar performance de relatórios
-- Data: 2025-11-07
-- Descrição: Índices para melhorar queries N+1 e otimizar buscas frequentes em relatórios

-- Índice para buscar profiles por role e status (usado em todos os relatórios de alunos)
CREATE INDEX IF NOT EXISTS idx_profiles_role_status
ON profiles(role, status);

-- Índices para enrollments (crítico para relatórios de matrícula)
CREATE INDEX IF NOT EXISTS idx_enrollments_enrolled_at
ON enrollments(enrolled_at DESC);

CREATE INDEX IF NOT EXISTS idx_enrollments_completed_at
ON enrollments(completed_at DESC)
WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_enrollments_status_dates
ON enrollments(status, enrolled_at, completed_at);

CREATE INDEX IF NOT EXISTS idx_enrollments_user_course
ON enrollments(user_id, course_id);

-- Índices para lesson_progress (crítico para cálculo de progresso)
CREATE INDEX IF NOT EXISTS idx_lesson_progress_enrollment_completed
ON lesson_progress(enrollment_id, is_completed);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_accessed
ON lesson_progress(user_id, last_accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_enrollment_accessed
ON lesson_progress(enrollment_id, last_accessed_at DESC);

-- Índices para test_attempts (crítico para relatórios de notas)
CREATE INDEX IF NOT EXISTS idx_test_attempts_test_user
ON test_attempts(test_id, user_id);

CREATE INDEX IF NOT EXISTS idx_test_attempts_user_submitted
ON test_attempts(user_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_attempts_test_submitted
ON test_attempts(test_id, submitted_at DESC)
WHERE submitted_at IS NOT NULL;

-- Índices para tests (filtros frequentes)
CREATE INDEX IF NOT EXISTS idx_tests_subject_active
ON tests(subject_id, is_active)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tests_course_active
ON tests(course_id, is_active)
WHERE is_active = true;

-- Índices para courses (filtros de publicação)
CREATE INDEX IF NOT EXISTS idx_courses_status_published
ON courses(status)
WHERE status = 'published';

-- Índices para activity_logs (usado em histórico de acesso)
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created
ON activity_logs(user_id, created_at DESC);

-- Comentários explicativos
COMMENT ON INDEX idx_profiles_role_status IS 'Otimiza filtros de alunos ativos nos relatórios';
COMMENT ON INDEX idx_enrollments_status_dates IS 'Otimiza queries de relatórios de matrículas por período';
COMMENT ON INDEX idx_lesson_progress_enrollment_completed IS 'Otimiza cálculo de progresso por matrícula';
COMMENT ON INDEX idx_test_attempts_test_user IS 'Elimina N+1 em relatórios de notas';
COMMENT ON INDEX idx_activity_logs_user_created IS 'Otimiza busca de último acesso do aluno';

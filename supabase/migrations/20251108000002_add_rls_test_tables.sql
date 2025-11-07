-- Migration: Implementar RLS em test_attempts e test_grades
-- Data: 2025-11-08
-- Descrição: Adiciona Row Level Security para proteger dados de tentativas e notas de testes

-- ============================================================================
-- PART 1: test_attempts
-- ============================================================================

-- Ativar RLS
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;

-- Política: Alunos podem visualizar suas próprias tentativas
CREATE POLICY "Students view own attempts"
ON test_attempts
FOR SELECT
USING (auth.uid() = user_id);

-- Política: Admins e instrutores podem visualizar todas as tentativas
CREATE POLICY "Admins and instructors view all attempts"
ON test_attempts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'instructor')
  )
);

-- Política: Alunos podem criar suas próprias tentativas
CREATE POLICY "Students create own attempts"
ON test_attempts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Política: Alunos podem atualizar suas próprias tentativas (apenas se não finalizadas)
CREATE POLICY "Students update own unsubmitted attempts"
ON test_attempts
FOR UPDATE
USING (
  auth.uid() = user_id
  AND submitted_at IS NULL
)
WITH CHECK (
  auth.uid() = user_id
  AND submitted_at IS NULL
);

-- Política: Admins podem atualizar qualquer tentativa
CREATE POLICY "Admins update any attempt"
ON test_attempts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);

-- Política: Admins podem deletar tentativas (para correções)
CREATE POLICY "Admins delete attempts"
ON test_attempts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);

-- ============================================================================
-- PART 2: test_grades
-- ============================================================================

-- Ativar RLS
ALTER TABLE test_grades ENABLE ROW LEVEL SECURITY;

-- Política: Alunos podem visualizar suas próprias notas
CREATE POLICY "Students view own grades"
ON test_grades
FOR SELECT
USING (auth.uid() = user_id);

-- Política: Admins e instrutores podem visualizar todas as notas
CREATE POLICY "Admins and instructors view all grades"
ON test_grades
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'instructor')
  )
);

-- Política: Sistema pode inserir notas (através de funções autorizadas)
-- Nota: INSERT direto por usuários não é permitido, apenas via triggers/funções
CREATE POLICY "System creates grades"
ON test_grades
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);

-- Política: Admins podem atualizar qualquer nota
CREATE POLICY "Admins update any grade"
ON test_grades
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);

-- Política: Admins podem deletar notas (para correções)
CREATE POLICY "Admins delete grades"
ON test_grades
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);

-- ============================================================================
-- PART 3: Documentação e índices de segurança
-- ============================================================================

-- Comentários para documentação
COMMENT ON TABLE test_attempts IS 'Tentativas de testes dos alunos. RLS ativo: alunos veem apenas suas tentativas, admins/instrutores veem todas.';
COMMENT ON TABLE test_grades IS 'Notas consolidadas dos testes. RLS ativo: alunos veem apenas suas notas, admins/instrutores veem todas.';

-- Índices para melhorar performance de RLS
CREATE INDEX IF NOT EXISTS idx_test_attempts_user_id
ON test_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_test_grades_user_id
ON test_grades(user_id);

-- ============================================================================
-- PART 4: Verificação
-- ============================================================================

DO $$
DECLARE
  ta_rls_enabled BOOLEAN;
  tg_rls_enabled BOOLEAN;
  ta_policies_count INTEGER;
  tg_policies_count INTEGER;
BEGIN
  -- Verificar RLS ativado
  SELECT relrowsecurity INTO ta_rls_enabled
  FROM pg_class
  WHERE relname = 'test_attempts';

  SELECT relrowsecurity INTO tg_rls_enabled
  FROM pg_class
  WHERE relname = 'test_grades';

  -- Contar políticas
  SELECT COUNT(*) INTO ta_policies_count
  FROM pg_policies
  WHERE tablename = 'test_attempts';

  SELECT COUNT(*) INTO tg_policies_count
  FROM pg_policies
  WHERE tablename = 'test_grades';

  -- Log de verificação
  RAISE NOTICE 'test_attempts: RLS = %, Políticas = %', ta_rls_enabled, ta_policies_count;
  RAISE NOTICE 'test_grades: RLS = %, Políticas = %', tg_rls_enabled, tg_policies_count;

  -- Validar
  IF NOT ta_rls_enabled OR NOT tg_rls_enabled THEN
    RAISE EXCEPTION 'RLS não foi ativado corretamente em todas as tabelas.';
  END IF;

  IF ta_policies_count < 6 OR tg_policies_count < 5 THEN
    RAISE WARNING 'Número de políticas menor que esperado. Verificar se todas foram criadas.';
  END IF;

  RAISE NOTICE 'Migração RLS concluída com sucesso.';
END $$;

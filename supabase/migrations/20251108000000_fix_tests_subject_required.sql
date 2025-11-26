-- Migration: Tornar subject_id obrigatório em tests
-- Data: 2025-11-08
-- Descrição: Corrige integridade referencial, garantindo que todos os testes tenham uma disciplina

-- Passo 1: Identificar testes sem subject_id (para auditoria)
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM tests WHERE subject_id IS NULL;

  IF orphan_count > 0 THEN
    RAISE NOTICE 'Encontrados % testes sem subject_id. Serão corrigidos automaticamente.', orphan_count;
  ELSE
    RAISE NOTICE 'Nenhum teste órfão encontrado. Migração prossegue sem correções.';
  END IF;
END $$;

-- Passo 2: Criar subject padrão para cada curso que tenha testes órfãos
INSERT INTO subjects (id, name, code, course_id, hours, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Disciplina Geral' AS name,
  'DISC-GERAL' AS code,
  t.course_id,
  40 AS hours,
  NOW() AS created_at,
  NOW() AS updated_at
FROM tests t
WHERE t.subject_id IS NULL
  AND t.course_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM subjects s
    WHERE s.course_id = t.course_id
      AND s.name = 'Disciplina Geral'
  )
GROUP BY t.course_id;

-- Passo 3: Atualizar testes sem subject_id para usar a disciplina padrão
UPDATE tests t
SET subject_id = s.id
FROM subjects s
WHERE t.subject_id IS NULL
  AND t.course_id = s.course_id
  AND s.name = 'Disciplina Geral';

-- Passo 4: Para testes sem course_id (edge case), criar uma disciplina global
INSERT INTO subjects (id, name, code, hours, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Disciplina Sem Curso' AS name,
  'DISC-ORPHAN' AS code,
  40 AS hours,
  NOW() AS created_at,
  NOW() AS updated_at
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE name = 'Disciplina Sem Curso' AND course_id IS NULL
)
AND EXISTS (
  SELECT 1 FROM tests WHERE subject_id IS NULL
);

-- Atribuir disciplina global aos testes órfãos completos
UPDATE tests t
SET subject_id = s.id
FROM subjects s
WHERE t.subject_id IS NULL
  AND s.name = 'Disciplina Sem Curso'
  AND s.course_id IS NULL;

-- Passo 5: Verificar se ainda existem testes sem subject_id
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count FROM tests WHERE subject_id IS NULL;

  IF remaining_count > 0 THEN
    RAISE EXCEPTION 'Ainda existem % testes sem subject_id após correção. Abortando migração.', remaining_count;
  ELSE
    RAISE NOTICE 'Todos os testes foram associados a uma disciplina com sucesso.';
  END IF;
END $$;

-- Passo 6: Tornar subject_id NOT NULL
ALTER TABLE tests
ALTER COLUMN subject_id SET NOT NULL;

-- Passo 7: Adicionar constraint FK se não existir (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_tests_subject'
      AND table_name = 'tests'
  ) THEN
    ALTER TABLE tests
    ADD CONSTRAINT fk_tests_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
    ON DELETE RESTRICT;

    RAISE NOTICE 'Constraint FK fk_tests_subject criada com sucesso.';
  ELSE
    RAISE NOTICE 'Constraint FK fk_tests_subject já existe.';
  END IF;
END $$;

-- Passo 8: Criar índice para melhorar performance de queries por subject
CREATE INDEX IF NOT EXISTS idx_tests_subject
ON tests(subject_id);

RAISE NOTICE 'Migração concluída com sucesso. subject_id é agora obrigatório em tests.';

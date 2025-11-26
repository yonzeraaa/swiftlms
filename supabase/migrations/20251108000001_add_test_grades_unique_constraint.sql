-- Migration: Adicionar UNIQUE constraint em test_grades
-- Data: 2025-11-08
-- Descrição: Garante que não haverá registros duplicados para o mesmo usuário e teste

-- Passo 1: Identificar duplicatas (para auditoria)
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT user_id, test_id, COUNT(*) as cnt
    FROM test_grades
    GROUP BY user_id, test_id
    HAVING COUNT(*) > 1
  ) AS duplicates;

  IF duplicate_count > 0 THEN
    RAISE WARNING 'Encontradas % duplicatas em test_grades. Serão mescladas.', duplicate_count;
  ELSE
    RAISE NOTICE 'Nenhuma duplicata encontrada em test_grades.';
  END IF;
END $$;

-- Passo 2: Mesclar duplicatas (manter o registro com melhor score e mais recente)
WITH duplicates AS (
  SELECT
    user_id,
    test_id,
    MAX(best_score) as max_score,
    MAX(last_attempt_date) as latest_date,
    SUM(total_attempts) as sum_attempts
  FROM test_grades
  GROUP BY user_id, test_id
  HAVING COUNT(*) > 1
),
records_to_keep AS (
  SELECT DISTINCT ON (tg.user_id, tg.test_id)
    tg.id
  FROM test_grades tg
  INNER JOIN duplicates d
    ON tg.user_id = d.user_id
    AND tg.test_id = d.test_id
  ORDER BY
    tg.user_id,
    tg.test_id,
    tg.best_score DESC,
    tg.last_attempt_date DESC NULLS LAST,
    tg.created_at DESC
)
UPDATE test_grades tg
SET
  best_score = d.max_score,
  total_attempts = d.sum_attempts,
  last_attempt_date = d.latest_date
FROM duplicates d,
     records_to_keep rtk
WHERE tg.id = rtk.id
  AND tg.user_id = d.user_id
  AND tg.test_id = d.test_id;

-- Passo 3: Deletar registros duplicados (manter apenas o registro atualizado)
WITH duplicates AS (
  SELECT
    user_id,
    test_id
  FROM test_grades
  GROUP BY user_id, test_id
  HAVING COUNT(*) > 1
),
records_to_keep AS (
  SELECT DISTINCT ON (tg.user_id, tg.test_id)
    tg.id
  FROM test_grades tg
  INNER JOIN duplicates d
    ON tg.user_id = d.user_id
    AND tg.test_id = d.test_id
  ORDER BY
    tg.user_id,
    tg.test_id,
    tg.best_score DESC,
    tg.last_attempt_date DESC NULLS LAST,
    tg.created_at DESC
)
DELETE FROM test_grades tg
USING duplicates d
WHERE tg.user_id = d.user_id
  AND tg.test_id = d.test_id
  AND tg.id NOT IN (SELECT id FROM records_to_keep);

-- Passo 4: Verificar se não há mais duplicatas
DO $$
DECLARE
  remaining_duplicates INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_duplicates
  FROM (
    SELECT user_id, test_id, COUNT(*) as cnt
    FROM test_grades
    GROUP BY user_id, test_id
    HAVING COUNT(*) > 1
  ) AS duplicates;

  IF remaining_duplicates > 0 THEN
    RAISE EXCEPTION 'Ainda existem % duplicatas após limpeza. Abortando migração.', remaining_duplicates;
  ELSE
    RAISE NOTICE 'Todas as duplicatas foram removidas com sucesso.';
  END IF;
END $$;

-- Passo 5: Adicionar UNIQUE constraint
ALTER TABLE test_grades
ADD CONSTRAINT test_grades_user_test_unique
UNIQUE (user_id, test_id);

-- Passo 6: Adicionar comentário para documentação
COMMENT ON CONSTRAINT test_grades_user_test_unique ON test_grades IS
'Garante que cada combinação de usuário e teste tenha apenas um registro de nota.';

RAISE NOTICE 'Migração concluída. UNIQUE constraint adicionado em test_grades(user_id, test_id).';

import { createClient } from '@/lib/supabase/server'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  details: {
    testGradesBestScore: number | null
    maxAttemptScore: number | null
    testGradesTotalAttempts: number | null
    actualAttemptsCount: number | null
    testGradesLastAttempt: string | null
    actualLastAttempt: string | null
  }
}

export async function validateGradeConsistency(
  userId: string,
  testId: string
): Promise<ValidationResult> {
  const supabase = await createClient()
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // 1. Buscar dados de test_grades
    const { data: testGrade } = await supabase
      .from('test_grades')
      .select('best_score, total_attempts, last_attempt_date, course_id, subject_id, test_id, user_id')
      .eq('user_id', userId)
      .eq('test_id', testId)
      .maybeSingle()

    // 2. Buscar todas as tentativas
    const { data: attempts } = await supabase
      .from('test_attempts')
      .select('score, submitted_at')
      .eq('user_id', userId)
      .eq('test_id', testId)

    const attemptScores = attempts?.map(a => a.score ?? 0) ?? []
    const maxAttemptScore = attemptScores.length > 0 ? Math.max(...attemptScores) : null
    const actualAttemptsCount = attempts?.length ?? 0

    const submittedAttempts = attempts?.filter(a => a.submitted_at) ?? []
    const actualLastAttempt = submittedAttempts.length > 0
      ? submittedAttempts.sort((a, b) =>
          new Date(b.submitted_at!).getTime() - new Date(a.submitted_at!).getTime()
        )[0].submitted_at
      : null

    // 3. Validações
    if (testGrade) {
      // 3.1. best_score deve ser >= max(attempt.score)
      if (maxAttemptScore !== null && testGrade.best_score !== null) {
        if (testGrade.best_score < maxAttemptScore) {
          errors.push(
            `test_grades.best_score (${testGrade.best_score}) é menor que a maior nota em tentativas (${maxAttemptScore})`
          )
        }
      }

      // 3.2. total_attempts deve ser igual ao count de tentativas
      if (testGrade.total_attempts !== actualAttemptsCount) {
        errors.push(
          `test_grades.total_attempts (${testGrade.total_attempts}) não corresponde ao número real de tentativas (${actualAttemptsCount})`
        )
      }

      // 3.3. last_attempt_date deve ser a data da última tentativa
      if (actualLastAttempt && testGrade.last_attempt_date) {
        const gradeDate = new Date(testGrade.last_attempt_date).getTime()
        const actualDate = new Date(actualLastAttempt).getTime()
        const diffMinutes = Math.abs(gradeDate - actualDate) / 1000 / 60

        if (diffMinutes > 1) {
          warnings.push(
            `test_grades.last_attempt_date difere da última tentativa real em ${diffMinutes.toFixed(0)} minutos`
          )
        }
      }

      // 3.4. Verificar referências válidas (FKs)
      const { data: test } = await supabase
        .from('tests')
        .select('id, course_id, subject_id')
        .eq('id', testId)
        .single()

      if (test) {
        if (testGrade.course_id !== test.course_id) {
          errors.push(
            `test_grades.course_id (${testGrade.course_id}) não corresponde ao curso do teste (${test.course_id})`
          )
        }

        if (testGrade.subject_id !== test.subject_id) {
          warnings.push(
            `test_grades.subject_id (${testGrade.subject_id}) não corresponde à disciplina do teste (${test.subject_id})`
          )
        }
      }

      // 3.5. Verificar se user_id e test_id estão corretos
      if (testGrade.user_id !== userId) {
        errors.push(`test_grades.user_id (${testGrade.user_id}) não corresponde ao userId fornecido (${userId})`)
      }

      if (testGrade.test_id !== testId) {
        errors.push(`test_grades.test_id (${testGrade.test_id}) não corresponde ao testId fornecido (${testId})`)
      }
    } else if (actualAttemptsCount > 0) {
      errors.push('Existem tentativas mas nenhum registro em test_grades')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      details: {
        testGradesBestScore: testGrade?.best_score ?? null,
        maxAttemptScore,
        testGradesTotalAttempts: testGrade?.total_attempts ?? null,
        actualAttemptsCount,
        testGradesLastAttempt: testGrade?.last_attempt_date ?? null,
        actualLastAttempt
      }
    }
  } catch (error) {
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Erro desconhecido na validação'],
      warnings: [],
      details: {
        testGradesBestScore: null,
        maxAttemptScore: null,
        testGradesTotalAttempts: null,
        actualAttemptsCount: null,
        testGradesLastAttempt: null,
        actualLastAttempt: null
      }
    }
  }
}

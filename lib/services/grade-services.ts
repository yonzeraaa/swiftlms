import { createClient } from '@/lib/supabase/server'

export interface AssignMaxGradeParams {
  userId: string
  testId: string
  adminId: string
  reason?: string
}

export interface AssignMaxGradeResult {
  success: boolean
  previousScore: number | null
  newScore: number
  gradeId: string
  attemptId: string | null
  errors?: string[]
}

export async function assignMaxGradeToStudent(
  params: AssignMaxGradeParams
): Promise<AssignMaxGradeResult> {
  const { userId, testId, adminId, reason } = params
  const supabase = await createClient()

  try {
    // 1. Validar que o admin tem permissão
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', adminId)
      .single()

    if (!adminProfile || adminProfile.role !== 'admin') {
      return {
        success: false,
        previousScore: null,
        newScore: 0,
        gradeId: '',
        attemptId: null,
        errors: ['Apenas administradores podem atribuir notas']
      }
    }

    // 2. Buscar informações do teste
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('id, title, course_id, subject_id, passing_score, is_active')
      .eq('id', testId)
      .single()

    if (testError || !test) {
      return {
        success: false,
        previousScore: null,
        newScore: 0,
        gradeId: '',
        attemptId: null,
        errors: ['Teste não encontrado']
      }
    }

    if (!test.is_active) {
      return {
        success: false,
        previousScore: null,
        newScore: 0,
        gradeId: '',
        attemptId: null,
        errors: ['Teste não está ativo']
      }
    }

    // 3. Verificar se aluno está matriculado no curso
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', test.course_id)
      .maybeSingle()

    if (!enrollment) {
      return {
        success: false,
        previousScore: null,
        newScore: 0,
        gradeId: '',
        attemptId: null,
        errors: ['Aluno não está matriculado neste curso']
      }
    }

    // 4. Buscar nota atual (melhor score)
    const { data: currentGrade } = await supabase
      .from('test_grades')
      .select('best_score, total_attempts')
      .eq('user_id', userId)
      .eq('test_id', testId)
      .maybeSingle()

    const previousScore = currentGrade?.best_score ?? null
    const maxScore = 100

    // 5. Criar nova tentativa em test_attempts
    const { data: newAttempt, error: attemptError } = await supabase
      .from('test_attempts')
      .insert({
        test_id: testId,
        user_id: userId,
        enrollment_id: enrollment.id,
        attempt_number: (currentGrade?.total_attempts ?? 0) + 1,
        score: maxScore,
        passed: true,
        answers: { admin_override: true, reason: reason || 'Nota máxima atribuída pelo administrador' },
        started_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        time_spent_minutes: 0
      })
      .select('id')
      .single()

    if (attemptError) {
      return {
        success: false,
        previousScore,
        newScore: maxScore,
        gradeId: '',
        attemptId: null,
        errors: [`Erro ao criar tentativa: ${attemptError.message}`]
      }
    }

    // 6. Atualizar/inserir em test_grades
    const { data: updatedGrade, error: gradeError } = await supabase
      .from('test_grades')
      .upsert({
        user_id: userId,
        test_id: testId,
        course_id: test.course_id,
        subject_id: test.subject_id,
        best_score: maxScore,
        total_attempts: (currentGrade?.total_attempts ?? 0) + 1,
        last_attempt_date: new Date().toISOString()
      }, { onConflict: 'user_id,test_id' })
      .select('id')
      .single()

    if (gradeError) {
      return {
        success: false,
        previousScore,
        newScore: maxScore,
        gradeId: '',
        attemptId: newAttempt?.id ?? null,
        errors: [`Erro ao atualizar nota: ${gradeError.message}`]
      }
    }

    // 7. Registrar em activity_logs
    await supabase
      .from('activity_logs')
      .insert({
        user_id: adminId,
        action: 'assign_max_grade',
        description: `Atribuiu nota máxima (${maxScore}) para o teste "${test.title}" ao aluno ${userId}`,
        metadata: {
          test_id: testId,
          student_id: userId,
          previous_score: previousScore,
          new_score: maxScore,
          reason: reason || null,
          attempt_id: newAttempt?.id
        }
      })

    return {
      success: true,
      previousScore,
      newScore: maxScore,
      gradeId: updatedGrade.id,
      attemptId: newAttempt?.id ?? null
    }
  } catch (error) {
    return {
      success: false,
      previousScore: null,
      newScore: 0,
      gradeId: '',
      attemptId: null,
      errors: [error instanceof Error ? error.message : 'Erro desconhecido']
    }
  }
}

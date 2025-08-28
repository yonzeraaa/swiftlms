import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { answers } = await request.json()
    
    // Verificar usuário autenticado
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const testId = id

    // Buscar dados do teste
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('*, test_answer_keys(*)')
      .eq('id', testId)
      .single()

    if (testError || !test) {
      return NextResponse.json(
        { error: 'Teste não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o teste está ativo
    if (!test.is_active) {
      return NextResponse.json(
        { error: 'Este teste não está mais disponível' },
        { status: 400 }
      )
    }

    // Buscar enrollment do usuário
    if (!test.course_id) {
      return NextResponse.json(
        { error: 'Teste não está associado a um curso' },
        { status: 400 }
      )
    }

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', test.course_id)
      .single()

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Você precisa estar matriculado no curso para fazer este teste' },
        { status: 403 }
      )
    }

    // Verificar tentativas anteriores
    const { data: previousAttempts, error: attemptsError } = await supabase
      .from('test_attempts')
      .select('id')
      .eq('test_id', testId)
      .eq('user_id', user.id)
      .order('attempt_number', { ascending: false })

    const attemptNumber = previousAttempts ? previousAttempts.length + 1 : 1

    // Verificar se excedeu o número máximo de tentativas
    if (test.max_attempts && attemptNumber > test.max_attempts) {
      return NextResponse.json(
        { error: `Você já atingiu o número máximo de tentativas (${test.max_attempts})` },
        { status: 400 }
      )
    }

    // Calcular nota
    const answerKeyFormatted = test.test_answer_keys.map(key => ({
      question_number: key.question_number,
      correct_answer: key.correct_answer,
      points: key.points || 10
    }))
    const { score, correctCount, totalQuestions } = calculateScore(answers, answerKeyFormatted)
    const passed = score >= (test.passing_score || 70)

    // Salvar tentativa
    const { data: attempt, error: attemptError } = await supabase
      .from('test_attempts')
      .insert({
        test_id: testId,
        user_id: user.id,
        enrollment_id: enrollment.id,
        attempt_number: attemptNumber,
        answers,
        score,
        passed,
        submitted_at: new Date().toISOString(),
        time_spent_minutes: null // Pode ser calculado se implementarmos timer
      })
      .select()
      .single()

    if (attemptError) {
      console.error('Erro ao salvar tentativa:', attemptError)
      return NextResponse.json(
        { error: 'Erro ao salvar tentativa' },
        { status: 500 }
      )
    }

    // Atualizar ou criar registro de notas consolidadas
    const { error: gradeError } = await supabase
      .from('test_grades')
      .upsert({
        user_id: user.id,
        course_id: test.course_id,
        subject_id: test.subject_id,
        test_id: testId,
        best_score: score,
        last_attempt_date: new Date().toISOString(),
        total_attempts: attemptNumber
      }, {
        onConflict: 'user_id,test_id',
        ignoreDuplicates: false
      })

    // Se a nova nota for melhor, atualizar
    if (!gradeError) {
      await supabase
        .from('test_grades')
        .update({
          best_score: score,
          last_attempt_date: new Date().toISOString(),
          total_attempts: attemptNumber
        })
        .eq('user_id', user.id)
        .eq('test_id', testId)
        .lt('best_score', score)
    }

    // Retornar resultado
    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt.id,
        score,
        passed,
        correctCount,
        totalQuestions,
        attemptNumber,
        maxAttempts: test.max_attempts,
        attemptsRemaining: test.max_attempts ? test.max_attempts - attemptNumber : null
      }
    })

  } catch (error) {
    console.error('Erro ao processar submissão:', error)
    return NextResponse.json(
      { error: 'Erro ao processar submissão' },
      { status: 500 }
    )
  }
}

function calculateScore(
  studentAnswers: Record<string, string>,
  answerKey: Array<{ question_number: number; correct_answer: string; points: number }>
): { score: number; correctCount: number; totalQuestions: number } {
  
  let totalPoints = 0
  let earnedPoints = 0
  let correctCount = 0

  answerKey.forEach(key => {
    const questionPoints = key.points || 10
    totalPoints += questionPoints
    
    const studentAnswer = studentAnswers[key.question_number.toString()]
    
    if (studentAnswer && studentAnswer.toUpperCase() === key.correct_answer.toUpperCase()) {
      earnedPoints += questionPoints
      correctCount++
    }
  })

  const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0

  return {
    score: Math.round(score * 100) / 100, // Arredondar para 2 casas decimais
    correctCount,
    totalQuestions: answerKey.length
  }
}
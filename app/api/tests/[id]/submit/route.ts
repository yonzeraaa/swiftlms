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
      .select('*')
      .eq('id', testId)
      .single()

    if (testError || !test) {
      console.error('Erro ao buscar teste:', testError)
      return NextResponse.json(
        { error: 'Teste não encontrado' },
        { status: 404 }
      )
    }
    
    // Buscar gabarito separadamente
    console.log(`Buscando gabarito para teste ${testId}...`)
    let { data: answerKeys, error: keysError } = await supabase
      .from('test_answer_keys')
      .select('*')
      .eq('test_id', testId)
      .order('question_number')
    
    if (keysError) {
      console.error('Erro ao buscar gabarito:', keysError)
      return NextResponse.json(
        { error: 'Erro ao buscar gabarito do teste. Por favor, tente novamente.' },
        { status: 500 }
      )
    }
    
    console.log(`Gabarito encontrado para teste ${testId}:`, {
      count: answerKeys?.length || 0,
      questions: answerKeys?.map(k => k.question_number) || [],
      firstKey: answerKeys?.[0] || null
    })
    
    // Verificar se o teste tem gabarito cadastrado
    if (!answerKeys || answerKeys.length === 0) {
      console.error(`Teste ${testId} não possui gabarito cadastrado. Verificando diretamente no banco...`)
      
      // Tentar buscar novamente sem filtros complexos
      const { data: directCheck, error: directError } = await supabase
        .from('test_answer_keys')
        .select('id, test_id, question_number, correct_answer')
        .eq('test_id', testId)
        .limit(1)
      
      console.log('Verificação direta:', { directCheck, directError })
      
      if (!directCheck || directCheck.length === 0) {
        return NextResponse.json(
          { error: 'Este teste ainda não possui gabarito cadastrado. Por favor, aguarde o professor configurar o gabarito.' },
          { status: 400 }
        )
      }
      
      // Se encontrou na verificação direta, tentar buscar todos novamente
      const { data: retryKeys } = await supabase
        .from('test_answer_keys')
        .select('*')
        .eq('test_id', testId)
      
      if (retryKeys && retryKeys.length > 0) {
        answerKeys = retryKeys
        console.log(`Gabarito recuperado na segunda tentativa: ${retryKeys.length} questões`)
      } else {
        return NextResponse.json(
          { error: 'Erro ao carregar gabarito completo. Por favor, tente novamente.' },
          { status: 500 }
        )
      }
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

    const courseIdForCertificate = test.course_id as string

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseIdForCertificate)
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
    const answerKeyFormatted = answerKeys.map((key: any) => ({
      question_number: key.question_number,
      correct_answer: key.correct_answer,
      points: key.points || 10,
      justification: key.justification || null
    }))
    
    console.log(`Calculando nota para teste ${testId}:`)
    console.log(`- Gabarito: ${answerKeyFormatted.length} questões`)
    console.log(`- Respostas do aluno:`, answers)
    
    const { score, correctCount, totalQuestions } = calculateScore(answers, answerKeyFormatted)
    const passed = score >= (test.passing_score || 70)
    
    console.log(`- Resultado: ${correctCount}/${totalQuestions} corretas, nota: ${score}%, ${passed ? 'APROVADO' : 'REPROVADO'}`)

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

    // Buscar nota existente para verificar se precisa atualizar
    const { data: existingGrade } = await supabase
      .from('test_grades')
      .select('best_score')
      .eq('user_id', user.id)
      .eq('test_id', testId)
      .single()

    // Se não existe registro ou a nova nota é melhor, atualizar
    if (!existingGrade || score > (existingGrade.best_score || 0)) {
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

      if (gradeError) {
        console.error('Erro ao atualizar nota:', gradeError)
      } else {
        console.log(`Nota atualizada: ${score}% (anterior: ${existingGrade?.best_score || 0}%)`)
      }
    } else {
      // Apenas atualizar o número de tentativas e data da última tentativa
      await supabase
        .from('test_grades')
        .update({
          last_attempt_date: new Date().toISOString(),
          total_attempts: attemptNumber
        })
        .eq('user_id', user.id)
        .eq('test_id', testId)
      
      console.log(`Nota mantida: ${existingGrade.best_score}% (nova tentativa: ${score}%)`)
    }

    // Se passou no teste, verificar se pode solicitar certificado
    if (passed && enrollment) {
      try {
        // Verificar se completou todas as lições do curso
        const { data: modules } = await supabase
          .from('course_modules')
          .select('id')
          .eq('course_id', test.course_id)
        
        const moduleIds = modules?.map(m => m.id) || []
        
        const { count: totalLessonsCount } = await supabase
          .from('lessons')
          .select('*', { count: 'exact', head: true })
          .in('module_id', moduleIds)

        const { count: completedLessonsCount } = await supabase
          .from('lesson_progress')
          .select('*', { count: 'exact', head: true })
          .eq('enrollment_id', enrollment.id)
          .eq('is_completed', true)

        const totalCount = totalLessonsCount || 0
        const completedCount = completedLessonsCount || 0
        const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

        console.log(`Verificando elegibilidade para certificado: ${progressPercentage}% progresso, nota: ${score}%`)

        const { data: tccApproved } = await supabase
          .from('tcc_submissions')
          .select('id')
          .eq('enrollment_id', enrollment.id)
          .eq('status', 'approved')
          .maybeSingle()

        const hasApprovedTcc = !!tccApproved

        // Se completou 100% do curso e passou no teste
        if (progressPercentage >= 100) {
          type CertificateType = 'technical' | 'lato-sensu'

          const ensureRequestForType = async (
            type: CertificateType,
            note: string
          ) => {
            const { data: existingRequest } = await supabase
              .from('certificate_requests')
              .select('id')
              .eq('enrollment_id', enrollment.id)
              .eq('certificate_type', type)
              .maybeSingle()

            const { data: existingCertificate } = await supabase
              .from('certificates')
              .select('id, approval_status')
              .eq('enrollment_id', enrollment.id)
              .eq('certificate_type', type)
              .eq('approval_status', 'approved')
              .maybeSingle()

            if (existingRequest || existingCertificate) {
              return null
            }

            const { data: newRequest, error: requestError } = await supabase
              .from('certificate_requests')
              .insert({
                enrollment_id: enrollment.id,
                user_id: user.id,
                course_id: courseIdForCertificate,
                total_lessons: totalCount,
                completed_lessons: completedCount,
                status: 'pending',
                request_date: new Date().toISOString(),
                notes: note,
                certificate_type: type
              })
              .select()
              .single()

            if (newRequest && !requestError) {
              console.log(`Solicitação de certificado (${type}) criada automaticamente:`, newRequest.id)

              await supabase
                .from('activity_logs')
                .insert({
                  user_id: user.id,
                  action: 'certificate_auto_requested',
                  entity_type: 'certificate_request',
                  entity_id: newRequest.id,
                  entity_name: `Certificado automático (${type === 'lato-sensu' ? 'Lato Sensu' : 'Técnico'})`,
                  metadata: {
                    test_id: testId,
                    test_score: score,
                    progress: progressPercentage,
                    certificate_type: type
                  }
                })
            }
          }

          await ensureRequestForType(
            'technical',
            `Solicitação automática (técnico) após aprovação no teste com ${score}%`
          )

          if (hasApprovedTcc) {
            await ensureRequestForType(
              'lato-sensu',
              `Solicitação automática (lato sensu) após aprovação no teste com ${score}% e TCC aprovado`
            )
          }
        }
      } catch (certError) {
        console.error('Erro ao verificar/criar solicitação de certificado:', certError)
        // Não falhar a submissão do teste por causa disso
      }
    }

    // Preparar detalhes das questões SEM justificativas (alunos não devem ver)
    const questionsDetail = answerKeyFormatted.map(key => ({
      questionNumber: key.question_number,
      correctAnswer: key.correct_answer,
      studentAnswer: answers[key.question_number.toString()] || null,
      isCorrect: answers[key.question_number.toString()]?.toUpperCase() === key.correct_answer.toUpperCase()
      // NÃO incluir justification - apenas para uso administrativo
    }))

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
        attemptsRemaining: test.max_attempts ? test.max_attempts - attemptNumber : null,
        questionsDetail
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

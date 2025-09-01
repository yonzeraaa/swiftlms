import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { courseId, enrollmentId } = await request.json()
    
    if (!courseId || !enrollmentId) {
      return NextResponse.json(
        { error: 'courseId e enrollmentId são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Buscar enrollment e curso
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select(`
        *,
        course:courses(*)
      `)
      .eq('id', enrollmentId)
      .eq('user_id', user.id)
      .single()

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Matrícula não encontrada' },
        { status: 404 }
      )
    }

    // Verificar progresso das lições
    const { data: totalLessons } = await supabase
      .from('lessons')
      .select('id', { count: 'exact' })
      .eq('module_id', enrollment.course.id)

    const { data: completedLessons } = await supabase
      .from('lesson_progress')
      .select('id', { count: 'exact' })
      .eq('enrollment_id', enrollmentId)
      .eq('is_completed', true)

    const lessonsCompleted = completedLessons?.length || 0
    const totalLessonsCount = totalLessons?.length || 0
    const progressPercentage = totalLessonsCount > 0 
      ? Math.round((lessonsCompleted / totalLessonsCount) * 100)
      : 0

    // Verificar nota nos testes
    const { data: testGrades } = await supabase
      .from('test_grades')
      .select('best_score')
      .eq('user_id', user.id)
      .eq('course_id', courseId)

    const bestTestScore = testGrades && testGrades.length > 0 
      ? Math.max(...testGrades.map(g => g.best_score || 0))
      : 0

    // Verificar requisitos
    const minimumProgress = 100 // 100% das lições
    const minimumTestScore = 70 // 70% no teste
    
    const requirementsMet = 
      progressPercentage >= minimumProgress && 
      bestTestScore >= minimumTestScore

    // Verificar se já existe solicitação
    const { data: existingRequest } = await supabase
      .from('certificate_requests')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .single()

    // Verificar se já existe certificado aprovado
    const { data: existingCertificate } = await supabase
      .from('certificates')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .eq('approval_status', 'approved')
      .single()

    return NextResponse.json({
      eligible: requirementsMet,
      progressPercentage,
      bestTestScore,
      totalLessons: totalLessonsCount,
      completedLessons: lessonsCompleted,
      requirementsMet,
      hasExistingRequest: !!existingRequest,
      requestStatus: existingRequest?.status,
      hasApprovedCertificate: !!existingCertificate,
      minimumProgress,
      minimumTestScore
    })
  } catch (error) {
    console.error('Erro ao verificar elegibilidade:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar elegibilidade' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const { courseId, enrollmentId } = await request.json()
    
    if (!courseId || !enrollmentId) {
      return NextResponse.json(
        { error: 'courseId e enrollmentId são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar elegibilidade primeiro
    const eligibilityResponse = await POST(request)
    const eligibility = await eligibilityResponse.json()

    if (!eligibility.eligible) {
      return NextResponse.json(
        { 
          error: 'Você ainda não atende aos requisitos para solicitar o certificado',
          details: eligibility
        },
        { status: 400 }
      )
    }

    if (eligibility.hasExistingRequest) {
      return NextResponse.json(
        { 
          error: 'Já existe uma solicitação de certificado para este curso',
          status: eligibility.requestStatus
        },
        { status: 400 }
      )
    }

    if (eligibility.hasApprovedCertificate) {
      return NextResponse.json(
        { error: 'Você já possui um certificado aprovado para este curso' },
        { status: 400 }
      )
    }

    // Criar solicitação de certificado
    const { data: newRequest, error } = await supabase
      .from('certificate_requests')
      .insert({
        enrollment_id: enrollmentId,
        user_id: user.id,
        course_id: courseId,
        total_lessons: eligibility.totalLessons,
        completed_lessons: eligibility.completedLessons,
        status: 'pending',
        request_date: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar solicitação:', error)
      return NextResponse.json(
        { error: 'Erro ao criar solicitação de certificado' },
        { status: 500 }
      )
    }

    // Registrar atividade
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: 'certificate_requested',
        entity_type: 'certificate_request',
        entity_id: newRequest.id,
        entity_name: `Certificado para curso ${courseId}`,
        metadata: {
          course_id: courseId,
          enrollment_id: enrollmentId,
          progress: eligibility.progressPercentage,
          test_score: eligibility.bestTestScore
        }
      })

    return NextResponse.json({
      success: true,
      request: newRequest,
      message: 'Solicitação de certificado criada com sucesso. Aguarde a aprovação do administrador.'
    })
  } catch (error) {
    console.error('Erro ao criar solicitação:', error)
    return NextResponse.json(
      { error: 'Erro ao criar solicitação de certificado' },
      { status: 500 }
    )
  }
}
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Função compartilhada para verificar elegibilidade
async function checkEligibility(courseId: string, enrollmentId: string, userId: string) {
  const supabase = await createClient()

  // Buscar enrollment e curso
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select(`
      *,
      course:courses(*)
    `)
    .eq('id', enrollmentId)
    .eq('user_id', userId)
    .single()

  if (!enrollment) {
    return null
  }

  // Buscar módulos do curso
  const { data: modules } = await supabase
    .from('course_modules')
    .select('id')
    .eq('course_id', courseId)

  const moduleIds = modules?.map(m => m.id) || []

  // Verificar progresso das lições
  const { count: totalLessonsCount } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .in('module_id', moduleIds)

  const { count: completedLessonsCount } = await supabase
    .from('lesson_progress')
    .select('*', { count: 'exact', head: true })
    .eq('enrollment_id', enrollmentId)
    .eq('is_completed', true)

  const lessonsCompleted = completedLessonsCount || 0
  const totalLessons = totalLessonsCount || 0
  const progressPercentage = totalLessons > 0
    ? Math.round((lessonsCompleted / totalLessons) * 100)
    : 0

  // Verificar nota nos testes
  const { data: testGrades } = await supabase
    .from('test_grades')
    .select('best_score')
    .eq('user_id', userId)
    .eq('course_id', courseId)

  const bestTestScore = testGrades && testGrades.length > 0
    ? Math.max(...testGrades.map(g => g.best_score || 0))
    : 0

  // Verificar requisitos
  const minimumProgress = 100
  const minimumTestScore = 70

  const requirementsMet =
    progressPercentage >= minimumProgress &&
    bestTestScore >= minimumTestScore

  // Verificar TCC aprovado
  const { data: approvedTcc } = await supabase
    .from('tcc_submissions')
    .select('id')
    .eq('enrollment_id', enrollmentId)
    .eq('status', 'approved')
    .maybeSingle()

  const hasApprovedTcc = !!approvedTcc

  const eligibleCertificates = {
    technical: requirementsMet,
    latoSensu: requirementsMet && hasApprovedTcc
  }

  type CertificateType = 'technical' | 'lato-sensu'

  const { data: existingRequestsRows } = await supabase
    .from('certificate_requests')
    .select('id, status, request_date')
    .eq('enrollment_id', enrollmentId)

  const requestRows = existingRequestsRows ?? []
  const requestsByType = {} as Partial<Record<CertificateType, typeof requestRows[number]>>

  const { data: existingCertificatesRows } = await supabase
    .from('certificates')
    .select('id, approval_status, issued_at')
    .eq('enrollment_id', enrollmentId)

  const certificateRows = existingCertificatesRows ?? []
  const certificatesByType = {} as Partial<Record<CertificateType, typeof certificateRows[number]>>

  const technicalRequest = requestsByType.technical
  const technicalCertificate = certificatesByType.technical && certificatesByType.technical.approval_status === 'approved'

  return {
    eligible: requirementsMet,
    progressPercentage,
    bestTestScore,
    totalLessons,
    completedLessons: lessonsCompleted,
    requirementsMet,
    minimumProgress,
    minimumTestScore,
    hasApprovedTcc,
    eligibleCertificates,
    requestsByType: {
      technical: requestsByType.technical || null,
      latoSensu: requestsByType['lato-sensu'] || null
    },
    approvedCertificatesByType: {
      technical: certificatesByType.technical || null,
      latoSensu: certificatesByType['lato-sensu'] || null
    },
    hasExistingRequest: !!technicalRequest,
    requestStatus: technicalRequest?.status,
    hasApprovedCertificate: !!technicalCertificate
  }
}

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

    const eligibility = await checkEligibility(courseId, enrollmentId, user.id)

    if (!eligibility) {
      return NextResponse.json(
        { error: 'Matrícula não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(eligibility)
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
    const { courseId, enrollmentId, certificateType: rawCertificateType } = await request.json()

    if (!courseId || !enrollmentId) {
      return NextResponse.json(
        { error: 'courseId e enrollmentId são obrigatórios' },
        { status: 400 }
      )
    }

    const certificateType: 'technical' | 'lato-sensu' = rawCertificateType === 'lato-sensu' ? 'lato-sensu' : 'technical'

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar elegibilidade primeiro
    const eligibility = await checkEligibility(courseId, enrollmentId, user.id)

    if (!eligibility) {
      return NextResponse.json(
        { error: 'Matrícula não encontrada' },
        { status: 404 }
      )
    }

    const eligibleKey = certificateType === 'lato-sensu' ? 'latoSensu' : 'technical'

    if (!eligibility.eligibleCertificates?.[eligibleKey]) {
      return NextResponse.json(
        { 
          error: 'Você ainda não atende aos requisitos para solicitar este certificado',
          details: eligibility
        },
        { status: 400 }
      )
    }

    const existingRequestForType = eligibility.requestsByType?.[certificateType === 'lato-sensu' ? 'latoSensu' : 'technical'] || null
    const approvedCertificateForType = eligibility.approvedCertificatesByType?.[certificateType === 'lato-sensu' ? 'latoSensu' : 'technical'] || null

    if (existingRequestForType) {
      return NextResponse.json(
        { 
          error: 'Já existe uma solicitação de certificado para este curso',
          status: existingRequestForType.status
        },
        { status: 400 }
      )
    }

    if (approvedCertificateForType?.approval_status === 'approved') {
      return NextResponse.json(
        { error: 'Você já possui um certificado aprovado deste tipo para este curso' },
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
        request_date: new Date().toISOString(),
        certificate_type: certificateType
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar solicitação:', error)
      console.error('Detalhes do erro:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      
      // Verificar se é erro de constraint única
      if (error.code === '23505') {
        return NextResponse.json(
          { 
            error: 'Já existe uma solicitação de certificado para esta matrícula',
            details: 'Uma solicitação já foi criada anteriormente'
          },
          { status: 400 }
        )
      }
      
      // Verificar se é erro de foreign key
      if (error.code === '23503') {
        return NextResponse.json(
          { 
            error: 'Erro de referência: verifique se o enrollment, user ou course existem',
            details: error.message
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Erro ao criar solicitação de certificado',
          details: error.message || 'Erro desconhecido',
          code: error.code
        },
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
        entity_name: `Certificado ${certificateType === 'lato-sensu' ? 'Lato Sensu' : 'Técnico'} para curso ${courseId}`,
        metadata: {
          course_id: courseId,
          enrollment_id: enrollmentId,
          progress: eligibility.progressPercentage,
          test_score: eligibility.bestTestScore,
          certificate_type: certificateType
        }
      })

    return NextResponse.json({
      success: true,
      request: newRequest,
      certificateType,
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

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateDiplomaPdf, formatDateBR, formatGrade } from '@/lib/services/diploma-pdf'
import { logger } from '@/lib/utils/logger'
import { randomUUID } from 'crypto'

interface GenerateDiplomaRequest {
  enrollmentId: string
  courseId: string
  conclusionDate: string // ISO date
  issueDate?: string // ISO date (default: hoje)
  grade: number
  courseHours: number
}

function generateVerificationCode(): string {
  return randomUUID().split('-')[0].toUpperCase()
}

function generateCertificateNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `LS-${year}-${random}`
}

export async function POST(request: Request) {
  try {
    const body: GenerateDiplomaRequest = await request.json()
    const { enrollmentId, courseId, conclusionDate, issueDate, grade, courseHours } = body

    if (!enrollmentId || !courseId || !conclusionDate || grade === undefined || !courseHours) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: enrollmentId, courseId, conclusionDate, grade, courseHours' },
        { status: 400 }
      )
    }

    // Autenticar e verificar permissões (admin/staff)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas administradores podem emitir diplomas' },
        { status: 403 }
      )
    }

    // Buscar dados do aluno e curso
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select(`
        id,
        user_id,
        course_id,
        user:profiles!enrollments_user_id_fkey(id, full_name),
        course:courses!enrollments_course_id_fkey(id, title)
      `)
      .eq('id', enrollmentId)
      .eq('course_id', courseId)
      .single()

    if (!enrollment) {
      return NextResponse.json({ error: 'Matrícula não encontrada' }, { status: 404 })
    }

    // Verificar se já existe certificado lato-sensu para esta matrícula
    const { data: existingCertificate } = await supabase
      .from('certificates')
      .select('id, verification_code')
      .eq('enrollment_id', enrollmentId)
      .eq('certificate_type', 'lato-sensu')
      .or('status.eq.issued,approval_status.eq.approved')
      .maybeSingle()

    if (existingCertificate) {
      return NextResponse.json(
        {
          error: 'Já existe um diploma lato-sensu emitido para esta matrícula',
          verificationCode: existingCertificate.verification_code
        },
        { status: 400 }
      )
    }

    const studentName = (enrollment.user as { full_name: string })?.full_name || 'Nome não encontrado'
    const courseName = (enrollment.course as { title: string })?.title || 'Curso não encontrado'
    const verificationCode = generateVerificationCode()
    const certificateNumber = generateCertificateNumber()

    const conclusionDateObj = new Date(conclusionDate)
    const issueDateObj = issueDate ? new Date(issueDate) : new Date()

    // Construir URL de verificação
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://swiftlms.vercel.app'
    const verificationUrl = `${baseUrl}/certificados/${verificationCode}`

    // Gerar o PDF
    const pdfBytes = await generateDiplomaPdf({
      studentName,
      courseName,
      conclusionDate: formatDateBR(conclusionDateObj),
      courseHours: courseHours.toString(),
      grade: formatGrade(grade),
      issueDate: formatDateBR(issueDateObj),
      verificationUrl,
    })

    // Upload do PDF para o Storage usando admin client
    const adminClient = createAdminClient()
    const pdfPath = `lato-sensu/${enrollmentId}-${verificationCode}.pdf`

    const { error: uploadError } = await adminClient.storage
      .from('certificados')
      .upload(pdfPath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      logger.error('Erro ao fazer upload do PDF:', uploadError, { context: 'DIPLOMA' })
      return NextResponse.json(
        { error: 'Erro ao salvar o diploma no storage', details: uploadError.message },
        { status: 500 }
      )
    }

    // Inserir registro na tabela certificates
    const { data: certificate, error: insertError } = await supabase
      .from('certificates')
      .insert({
        enrollment_id: enrollmentId,
        user_id: enrollment.user_id,
        course_id: courseId,
        certificate_number: certificateNumber,
        verification_code: verificationCode,
        certificate_type: 'lato-sensu',
        status: 'issued',
        approval_status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        issued_at: issueDateObj.toISOString(),
        conclusion_date: conclusionDateObj.toISOString().split('T')[0],
        grade,
        course_hours: courseHours,
        pdf_path: pdfPath,
        metadata: {
          student_name: studentName,
          course_name: courseName,
          issue_date_br: formatDateBR(issueDateObj),
          conclusion_date_br: formatDateBR(conclusionDateObj),
        },
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Erro ao inserir certificado:', insertError, { context: 'DIPLOMA' })
      // Tentar remover o PDF do storage em caso de falha
      await adminClient.storage.from('certificados').remove([pdfPath])
      return NextResponse.json(
        { error: 'Erro ao registrar o diploma', details: insertError.message },
        { status: 500 }
      )
    }

    // Registrar atividade
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: 'diploma_issued',
        entity_type: 'certificate',
        entity_id: certificate.id,
        entity_name: `Diploma Lato Sensu - ${studentName}`,
        metadata: {
          student_id: enrollment.user_id,
          course_id: courseId,
          verification_code: verificationCode,
          certificate_number: certificateNumber,
        },
      })

    // Gerar URL assinada para download
    const { data: signedUrl } = await adminClient.storage
      .from('certificados')
      .createSignedUrl(pdfPath, 3600) // 1 hora de validade

    return NextResponse.json({
      success: true,
      certificate: {
        id: certificate.id,
        certificateNumber,
        verificationCode,
        verificationUrl,
        pdfPath,
        downloadUrl: signedUrl?.signedUrl,
      },
      message: 'Diploma emitido com sucesso',
    })
  } catch (error) {
    logger.error('Erro ao gerar diploma:', error, { context: 'DIPLOMA' })
    return NextResponse.json(
      { error: 'Erro interno ao gerar diploma' },
      { status: 500 }
    )
  }
}

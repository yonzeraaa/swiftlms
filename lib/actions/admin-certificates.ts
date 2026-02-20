'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Database } from '@/lib/database.types'

type Enrollment = Database['public']['Tables']['enrollments']['Row']
type Certificate = Database['public']['Tables']['certificates']['Row']
type Course = Database['public']['Tables']['courses']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface CompletedEnrollment extends Enrollment {
  course: Course
  user: Profile
  certificate?: Certificate
}

export async function getCertificatesData() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      redirect('/dashboard')
    }

    // Fetch certificate requests with related data
    const { data: requests } = await supabase
      .from('certificate_requests' as any)
      .select('*')
      .order('request_date', { ascending: false })

    // Fetch related data for each request
    const requestsWithRelations = await Promise.all((requests || []).map(async (request: any) => {
      const [userRes, courseRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', request.user_id).single(),
        supabase.from('courses').select('*').eq('id', request.course_id).single()
      ])

      return {
        ...request,
        user: userRes.data,
        course: courseRes.data
      }
    }))

    // Fetch completed enrollments
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        *,
        course:courses(*),
        user:profiles(*)
      `)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })

    // Fetch existing certificates with user and course data
    const { data: certs } = await supabase
      .from('certificates')
      .select(`
        *,
        user:profiles!certificates_user_id_fkey(*),
        course:courses!certificates_course_id_fkey(*)
      `)
      .order('issued_at', { ascending: false })

    // Map certificates to enrollments
    const enrollmentsWithCerts = enrollments?.map((enrollment: any) => ({
      ...enrollment,
      certificate: certs?.find((cert: any) =>
        cert.enrollment_id === enrollment.id
      )
    })) || []

    return {
      success: true,
      certificateRequests: requestsWithRelations,
      completedEnrollments: enrollmentsWithCerts as CompletedEnrollment[],
      certificates: certs || []
    }
  } catch (error) {
    console.error('Error fetching certificates data:', error)
    return {
      success: false,
      error: 'Erro ao buscar dados de certificados',
      certificateRequests: [],
      completedEnrollments: [],
      certificates: []
    }
  }
}

export async function approveCertificateRequest(requestId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { data, error } = await supabase.rpc('approve_certificate_request' as any, {
      p_request_id: requestId,
      p_admin_id: user.id
    })

    const result = Array.isArray(data) ? data[0] : data

    if (error) {
      console.error('Error approving certificate:', error)
      return { success: false, error: 'Erro ao aprovar certificado' }
    }

    if (result?.success) {
      return { success: true, message: result.message || 'Certificado aprovado com sucesso!' }
    }

    const fallbackMessage = 'O aluno não cumpriu com todos os requisitos para aprovação e emissão do certificado.'
    const detailedMessage = typeof result?.message === 'string' && result.message.trim().length > 0
      ? result.message
      : fallbackMessage

    return { success: false, error: detailedMessage }
  } catch (error) {
    console.error('Error approving certificate:', error)
    return { success: false, error: 'Erro ao aprovar certificado' }
  }
}

export async function rejectCertificateRequest(requestId: string, reason: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { data, error } = await supabase.rpc('reject_certificate_request' as any, {
      p_request_id: requestId,
      p_admin_id: user.id,
      p_reason: reason
    })

    if (error || !data) {
      console.error('Error rejecting certificate:', error)
      return { success: false, error: 'Erro ao rejeitar requisição' }
    }

    return { success: true, message: 'Requisição rejeitada' }
  } catch (error) {
    console.error('Error rejecting certificate:', error)
    return { success: false, error: 'Erro ao rejeitar requisição' }
  }
}

export async function generateCertificate(enrollmentData: {
  id: string
  user_id: string
  course_id: string
  progress_percentage: number | null
  course: {
    instructor_id: string | null
    duration_hours: number | null
  }
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    const verificationCode = Math.random().toString(36).substr(2, 16).toUpperCase()

    // Get instructor name
    let instructorName = 'SwiftEDU Team'

    if (enrollmentData.course.instructor_id) {
      const { data: instructor } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', enrollmentData.course.instructor_id)
        .single()

      if (instructor?.full_name) {
        instructorName = instructor.full_name
      }
    }

    const { error } = await supabase
      .from('certificates')
      .insert({
        user_id: enrollmentData.user_id,
        course_id: enrollmentData.course_id,
        enrollment_id: enrollmentData.id,
        certificate_number: certificateNumber,
        verification_code: verificationCode,
        course_hours: enrollmentData.course.duration_hours || 0,
        grade: enrollmentData.progress_percentage || 100,
        issued_at: new Date().toISOString(),
        instructor_name: instructorName,
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id
      })

    if (error) {
      console.error('Error generating certificate:', error)
      return { success: false, error: 'Erro ao gerar certificado' }
    }

    return { success: true, message: 'Certificado gerado com sucesso!' }
  } catch (error) {
    console.error('Error generating certificate:', error)
    return { success: false, error: 'Erro ao gerar certificado' }
  }
}

export async function deleteCertificate(certificateId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('certificates')
      .delete()
      .eq('id', certificateId)

    if (error) {
      console.error('Error deleting certificate:', error)
      return { success: false, error: 'Erro ao excluir certificado' }
    }

    return { success: true, message: 'Certificado excluído com sucesso' }
  } catch (error) {
    console.error('Error deleting certificate:', error)
    return { success: false, error: 'Erro ao excluir certificado' }
  }
}

export async function updateCertificateStatus(
  certificateId: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const updateData: any = {
      approval_status: status,
      approved_at: new Date().toISOString(),
      ...(status === 'approved' && { status: 'issued' }),
    }

    if (status === 'rejected' && rejectionReason) {
      updateData.rejection_reason = rejectionReason
    }

    const { error } = await supabase
      .from('certificates')
      .update(updateData)
      .eq('id', certificateId)

    if (error) {
      console.error('Error updating certificate:', error)
      return { success: false, error: 'Erro ao atualizar certificado' }
    }

    return { success: true, message: `Certificado ${status === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso!` }
  } catch (error) {
    console.error('Error updating certificate:', error)
    return { success: false, error: 'Erro ao atualizar certificado' }
  }
}

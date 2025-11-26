'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getTccSubmissionsData(filter?: string) {
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

    let query = supabase
      .from('tcc_submissions')
      .select(`
        *,
        user:profiles!tcc_submissions_user_id_fkey(full_name, email),
        course:courses(title)
      `)
      .order('submission_date', { ascending: false })

    if (filter && filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data: submissionsData, error } = await query

    if (error) {
      console.error('Error fetching TCC submissions:', error)
      return { success: false, error: error.message, submissions: [] }
    }

    return { success: true, submissions: submissionsData || [] }
  } catch (error) {
    console.error('Error fetching TCC submissions:', error)
    return { success: false, error: 'Erro ao carregar dados', submissions: [] }
  }
}

export async function evaluateTccSubmission(data: {
  submissionId: string
  grade: number
  feedback: string
  status: 'approved' | 'rejected'
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    // Validate inputs
    if (data.grade < 0 || data.grade > 100) {
      return { success: false, error: 'A nota deve ser um número entre 0 e 100' }
    }

    if (!data.feedback.trim()) {
      return { success: false, error: 'Por favor, forneça um feedback' }
    }

    // Get submission details
    const { data: submission } = await supabase
      .from('tcc_submissions')
      .select('enrollment_id')
      .eq('id', data.submissionId)
      .single()

    if (!submission) {
      return { success: false, error: 'Submissão não encontrada' }
    }

    // Update submission with evaluation
    const { error: updateError } = await supabase
      .from('tcc_submissions')
      .update({
        grade: data.grade,
        feedback: data.feedback,
        status: data.status,
        evaluated_by: user.id,
        evaluated_at: new Date().toISOString()
      })
      .eq('id', data.submissionId)

    if (updateError) {
      console.error('Error updating TCC submission:', updateError)
      return { success: false, error: 'Erro ao avaliar TCC' }
    }

    // If approved, calculate final grade and update certificate
    if (data.status === 'approved') {
      const { data: finalGradeData } = await supabase
        .rpc('calculate_final_grade', {
          p_enrollment_id: submission.enrollment_id
        })

      if (finalGradeData !== null) {
        const certificateType = 'lato-sensu' as const

        // Check if certificate exists
        const { data: existingCert } = await supabase
          .from('certificates')
          .select('id')
          .eq('enrollment_id', submission.enrollment_id)
          .eq('certificate_type', certificateType)
          .single()

        if (existingCert) {
          // Update existing certificate
          await supabase
            .from('certificates')
            .update({
              tcc_id: data.submissionId,
              final_grade: finalGradeData,
              approval_status: 'approved',
              approved_at: new Date().toISOString(),
              approved_by: user.id,
              certificate_type: certificateType
            })
            .eq('id', existingCert.id)
        } else {
          // Get enrollment details
          const { data: enrollment } = await supabase
            .from('enrollments')
            .select('user_id, course_id')
            .eq('id', submission.enrollment_id)
            .single()

          if (enrollment) {
            // Create new certificate
            const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
            const verificationCode = `VER-${Math.random().toString(36).substr(2, 12).toUpperCase()}`

            await supabase
              .from('certificates')
              .insert({
                user_id: enrollment.user_id,
                course_id: enrollment.course_id,
                enrollment_id: submission.enrollment_id,
                certificate_number: certificateNumber,
                verification_code: verificationCode,
                tcc_id: data.submissionId,
                final_grade: finalGradeData,
                grade: finalGradeData,
                approval_status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: user.id,
                certificate_type: certificateType
              })
          }
        }
      }
    }

    return { success: true, message: 'TCC avaliado com sucesso!' }
  } catch (error) {
    console.error('Error evaluating TCC:', error)
    return { success: false, error: 'Erro ao avaliar TCC. Tente novamente.' }
  }
}

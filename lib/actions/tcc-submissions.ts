'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Get TCC submission data for student
 * SECURITY: Server-side only, no token exposure
 */
export async function getTCCSubmissionData() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    // Get enrollments with courses
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        id,
        course_id,
        course:courses(id, title)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')

    // Get existing TCC submissions with course info
    const { data: submissions } = await supabase
      .from('tcc_submissions')
      .select(`
        *,
        course:courses(title)
      `)
      .eq('user_id', user.id)
      .order('submission_date', { ascending: false })

    // Get admin email for contact
    const { data: admins } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'admin')
      .limit(1)

    return {
      enrollments: enrollments || [],
      submissions: submissions || [],
      adminEmail: admins?.[0]?.email || ''
    }
  } catch (error) {
    console.error('Error fetching TCC submission data:', error)
    return null
  }
}

/**
 * Create or update TCC submission
 * SECURITY: Server-side only, no token exposure
 */
export async function submitTCC(data: {
  title: string
  course_id: string
  enrollment_id: string
  document_url?: string
  description?: string
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    // Check if submission already exists
    const { data: existing } = await supabase
      .from('tcc_submissions')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('enrollment_id', data.enrollment_id)
      .single()

    if (existing) {
      // Update existing submission
      const { error } = await supabase
        .from('tcc_submissions')
        .update({
          title: data.title,
          file_url: data.document_url,
          description: data.description,
          submission_date: new Date().toISOString(),
          status: 'pending'
        })
        .eq('id', existing.id)

      if (error) {
        console.error('Error updating TCC submission:', error)
        return { success: false, error: error.message }
      }
    } else {
      // Create new submission
      const { error } = await supabase
        .from('tcc_submissions')
        .insert({
          user_id: user.id,
          course_id: data.course_id,
          enrollment_id: data.enrollment_id,
          title: data.title,
          file_url: data.document_url,
          description: data.description,
          status: 'pending'
        })

      if (error) {
        console.error('Error creating TCC submission:', error)
        return { success: false, error: error.message }
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error submitting TCC:', error)
    return { success: false, error: error?.message || 'Erro desconhecido' }
  }
}

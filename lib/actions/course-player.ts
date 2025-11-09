'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Get course player data
 * SECURITY: Server-side only, no token exposure
 */
export async function getCoursePlayerData(courseId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()

    if (courseError) throw courseError

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Get enrollment status
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single()

    // Get enrollment modules (access control)
    const { data: enrollmentModules } = await supabase
      .from('enrollment_modules')
      .select('module_id')
      .eq('enrollment_id', enrollment?.id || '')

    // Get course structure with modules, subjects, and lessons
    const { data: modules } = await supabase
      .from('course_modules')
      .select(`
        *,
        module_subjects (
          order_index,
          subjects (
            *,
            lessons (*)
          )
        )
      `)
      .eq('course_id', courseId)
      .order('order_index')

    // Get lesson progress
    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)

    // Get course reviews
    const { data: reviews } = await supabase
      .from('course_reviews')
      .select('*')
      .eq('course_id', courseId)

    return {
      course,
      userRole: profile?.role || 'student',
      enrollment,
      enrollmentModules: enrollmentModules || [],
      modules: modules || [],
      progress: progress || [],
      reviews: reviews || []
    }
  } catch (error) {
    console.error('Error fetching course player data:', error)
    return null
  }
}

/**
 * Mark lesson as complete
 * SECURITY: Server-side only, no token exposure
 */
export async function markLessonComplete(lessonId: string, timeSpent: number = 0) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
        time_spent: timeSpent
      }, {
        onConflict: 'user_id,lesson_id'
      })

    if (error) {
      console.error('Error marking lesson complete:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error marking lesson complete:', error)
    return { success: false, error: error?.message || 'Erro desconhecido' }
  }
}

/**
 * Update enrollment progress
 * SECURITY: Server-side only, no token exposure
 */
export async function updateEnrollmentProgress(enrollmentId: string, progress: number) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('enrollments')
      .update({
        progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', enrollmentId)
      .eq('user_id', user.id) // Security check

    if (error) {
      console.error('Error updating enrollment progress:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error updating enrollment progress:', error)
    return { success: false, error: error?.message || 'Erro desconhecido' }
  }
}

'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Get course player data
 * SECURITY: Server-side only, no token exposure
 */
export async function getCoursePlayerData(courseId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized', redirectTo: '/' }
    }

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

    const isAdmin = profile?.role === 'admin'

    // Get enrollment status (skip for admin)
    let enrollment = null
    let enrollmentModules = null

    if (!isAdmin) {
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single()

      enrollment = enrollmentData

      // Get enrollment modules (access control) - only for enrolled students
      if (enrollment) {
        const { data: modules } = await supabase
          .from('enrollment_modules')
          .select('module_id')
          .eq('enrollment_id', enrollment.id)

        enrollmentModules = modules
      }
    }

    // Get course structure with modules, subjects, and lessons
    const { data: modules } = await supabase
      .from('course_modules')
      .select(`
        *,
        module_subjects (
          subject:subjects (
            *,
            subject_lessons (
              lesson:lessons (*)
            )
          ),
          order_index
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
      .select('rating, title, comment, created_at')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })

    // Get instructor info
    let instructorInfo = null
    if (course.instructor_id) {
      const { data: instructorData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', course.instructor_id)
        .single()

      if (instructorData) {
        instructorInfo = {
          name: instructorData.full_name || 'Instrutor',
          avatar: instructorData.avatar_url || undefined
        }
      }
    }

    return {
      success: true,
      course,
      userRole: profile?.role || 'student',
      isAdmin,
      enrollment,
      enrollmentModules: enrollmentModules || [],
      modules: modules || [],
      progress: progress || [],
      reviews: reviews || [],
      instructor: instructorInfo,
      userId: user.id
    }
  } catch (error) {
    console.error('Error fetching course player data:', error)
    return { success: false, error: 'Erro ao carregar dados do curso' }
  }
}

/**
 * Mark lesson as complete
 * SECURITY: Server-side only, no token exposure
 */
export async function markLessonComplete(lessonId: string, enrollmentId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('lesson_progress')
      .upsert({
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        user_id: user.id,
        is_completed: true,
        completed_at: new Date().toISOString()
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
        progress_percentage: progress,
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

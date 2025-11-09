'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Check if current user can manage subjects for a course
 *
 * SECURITY: Verifies user is admin or course instructor
 * Uses server client with httpOnly cookies
 */
export async function checkSubjectManagementPermission(instructorId?: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        success: false,
        canManage: false,
        error: 'Not authenticated'
      }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return {
        success: false,
        canManage: false,
        error: profileError.message
      }
    }

    // User can manage if admin or course instructor
    const isAdmin = profile?.role === 'admin'
    const isInstructor = instructorId === user.id

    return {
      success: true,
      canManage: isAdmin || isInstructor,
      error: null
    }
  } catch (error: any) {
    console.error('Error in checkSubjectManagementPermission:', error)
    return {
      success: false,
      canManage: false,
      error: error.message || 'Unknown error'
    }
  }
}

/**
 * Get all subjects and course subjects for a specific course
 *
 * SECURITY: Uses server client with httpOnly cookies
 */
export async function getSubjectsForCourse(courseId: string) {
  try {
    const supabase = await createClient()

    // Get all subjects
    const { data: subjectsData, error: subjectsError } = await supabase
      .from('subjects')
      .select('*')
      .order('name')

    if (subjectsError) {
      console.error('Error fetching subjects:', subjectsError)
      return {
        success: false,
        subjects: [],
        courseSubjects: [],
        error: subjectsError.message
      }
    }

    // Get course subjects with joined subject data
    const { data: courseSubjectsData, error: courseSubjectsError } = await supabase
      .from('course_subjects')
      .select('*, subjects(*)')
      .eq('course_id', courseId)
      .order('order_index, is_required')

    if (courseSubjectsError) {
      console.error('Error fetching course subjects:', courseSubjectsError)
      return {
        success: false,
        subjects: subjectsData || [],
        courseSubjects: [],
        error: courseSubjectsError.message
      }
    }

    return {
      success: true,
      subjects: subjectsData || [],
      courseSubjects: courseSubjectsData || [],
      error: null
    }
  } catch (error: any) {
    console.error('Error in getSubjectsForCourse:', error)
    return {
      success: false,
      subjects: [],
      courseSubjects: [],
      error: error.message || 'Unknown error'
    }
  }
}

/**
 * Add a subject to a course
 *
 * SECURITY: Uses server client with httpOnly cookies
 * RLS policies enforce permission checks
 */
export async function addSubjectToCourse(
  courseId: string,
  subjectId: string,
  credits: number,
  isRequired: boolean
) {
  try {
    const supabase = await createClient()

    // Get next order_index
    const { data: maxOrderData } = await supabase
      .from('course_subjects')
      .select('order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = maxOrderData ? ((maxOrderData as any).order_index || 0) + 1 : 1

    // Insert new course subject
    const { error } = await supabase
      .from('course_subjects')
      .insert({
        course_id: courseId,
        subject_id: subjectId,
        order_index: nextOrder,
        credits,
        is_required: isRequired
      })

    if (error) {
      console.error('Error adding subject to course:', error)

      // Handle specific errors
      if (error.code === '42501') {
        return {
          success: false,
          error: 'Você não tem permissão para adicionar disciplinas. Apenas administradores podem realizar esta ação.'
        }
      } else if (error.code === '23505') {
        return {
          success: false,
          error: 'Esta disciplina já está adicionada a este curso.'
        }
      }

      return {
        success: false,
        error: error.message || 'Erro ao adicionar disciplina'
      }
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error in addSubjectToCourse:', error)
    return {
      success: false,
      error: error.message || 'Erro inesperado ao adicionar disciplina'
    }
  }
}

/**
 * Remove a subject from a course
 *
 * SECURITY: Uses server client with httpOnly cookies
 * RLS policies enforce permission checks
 */
export async function removeSubjectFromCourse(courseSubjectId: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('course_subjects')
      .delete()
      .eq('id', courseSubjectId)

    if (error) {
      console.error('Error removing subject from course:', error)

      // Handle specific errors
      if (error.code === '42501') {
        return {
          success: false,
          error: 'Você não tem permissão para remover disciplinas. Apenas administradores podem realizar esta ação.'
        }
      }

      return {
        success: false,
        error: error.message || 'Erro ao remover disciplina'
      }
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error in removeSubjectFromCourse:', error)
    return {
      success: false,
      error: error.message || 'Erro inesperado ao remover disciplina'
    }
  }
}

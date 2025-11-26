'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Get complete course structure with modules, subjects, and lessons
 *
 * SECURITY: Uses server client with httpOnly cookies
 */
export async function getCourseStructure(courseId: string) {
  try {
    const supabase = await createClient()

    // Get course modules
    const { data: modulesData, error: modulesError } = await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index')

    if (modulesError) {
      console.error('Error fetching modules:', modulesError)
      return {
        success: false,
        modules: [],
        moduleSubjects: {},
        lessons: {},
        error: modulesError.message
      }
    }

    const modules = modulesData || []
    const moduleSubjectsMap: Record<string, any[]> = {}
    const lessonsMap: Record<string, any[]> = {}

    // For each module, load its subjects and lessons
    for (const module of modules) {
      // Load module subjects
      const { data: subjectsData } = await supabase
        .from('module_subjects')
        .select('*, subjects(*)')
        .eq('module_id', module.id)
        .order('order_index')

      moduleSubjectsMap[module.id] = subjectsData || []

      // Load module lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('module_id', module.id)
        .order('order_index')

      lessonsMap[module.id] = lessonsData || []
    }

    return {
      success: true,
      modules,
      moduleSubjects: moduleSubjectsMap,
      lessons: lessonsMap,
      error: null
    }
  } catch (error: any) {
    console.error('Error in getCourseStructure:', error)
    return {
      success: false,
      modules: [],
      moduleSubjects: {},
      lessons: {},
      error: error.message || 'Unknown error'
    }
  }
}

/**
 * Reorder course modules
 *
 * SECURITY: Uses server client with httpOnly cookies
 * RLS policies enforce permission checks
 */
export async function reorderCourseModules(courseId: string, moduleIds: string[]) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.rpc('reorder_course_modules' as any, {
      p_course_id: courseId,
      p_module_ids: moduleIds
    })

    if (error) {
      console.error('Error reordering modules:', error)
      return {
        success: false,
        error: error.message || 'Erro ao reordenar módulos'
      }
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error in reorderCourseModules:', error)
    return {
      success: false,
      error: error.message || 'Erro inesperado ao reordenar módulos'
    }
  }
}

/**
 * Reorder module subjects
 *
 * SECURITY: Uses server client with httpOnly cookies
 * RLS policies enforce permission checks
 */
export async function reorderModuleSubjects(moduleId: string, subjectIds: string[]) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.rpc('reorder_module_subjects' as any, {
      p_module_id: moduleId,
      p_subject_ids: subjectIds
    })

    if (error) {
      console.error('Error reordering subjects:', error)
      return {
        success: false,
        error: error.message || 'Erro ao reordenar disciplinas'
      }
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error in reorderModuleSubjects:', error)
    return {
      success: false,
      error: error.message || 'Erro inesperado ao reordenar disciplinas'
    }
  }
}

/**
 * Reorder lessons within a module
 *
 * SECURITY: Uses server client with httpOnly cookies
 * RLS policies enforce permission checks
 */
export async function reorderLessons(moduleId: string, lessonIds: string[]) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.rpc('reorder_lessons' as any, {
      p_module_id: moduleId,
      p_lesson_ids: lessonIds
    })

    if (error) {
      console.error('Error reordering lessons:', error)
      return {
        success: false,
        error: error.message || 'Erro ao reordenar aulas'
      }
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error in reorderLessons:', error)
    return {
      success: false,
      error: error.message || 'Erro inesperado ao reordenar aulas'
    }
  }
}

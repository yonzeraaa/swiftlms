'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getLessonsData() {
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
      redirect('/student-dashboard')
    }

    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select(`
        *,
        subject_lessons (
          subject_id,
          subjects (
            id,
            name,
            code
          )
        ),
        course_modules (
          id,
          title,
          courses (
            id,
            title
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (lessonsError) throw lessonsError

    if (lessonsData && lessonsData.length > 0) {
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, is_completed')

      const progressStats: { [key: string]: { completed: number, total: number } } = {}

      progressData?.forEach((progress: any) => {
        if (!progressStats[progress.lesson_id]) {
          progressStats[progress.lesson_id] = { completed: 0, total: 0 }
        }
        progressStats[progress.lesson_id].total++
        if (progress.is_completed) {
          progressStats[progress.lesson_id].completed++
        }
      })

      return {
        lessons: lessonsData || [],
        lessonProgress: progressStats
      }
    }

    return {
      lessons: lessonsData || [],
      lessonProgress: {}
    }
  } catch (error) {
    console.error('Error fetching lessons data:', error)
    return null
  }
}

export async function createLesson(lessonData: {
  title: string
  description?: string
  content_type: string
  content_url?: string
  content?: string
  duration_minutes?: number
  order_index: number
  is_preview: boolean
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('lessons')
      .insert({
        title: lessonData.title,
        description: lessonData.description || null,
        content_type: lessonData.content_type,
        content_url: lessonData.content_url || null,
        content: lessonData.content || null,
        duration_minutes: lessonData.duration_minutes || null,
        order_index: lessonData.order_index,
        is_preview: lessonData.is_preview,
        created_at: new Date().toISOString()
      })

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error creating lesson:', error)
    return { success: false, error: error.message || 'Erro ao criar aula' }
  }
}

export async function updateLesson(lessonId: string, lessonData: {
  title: string
  description?: string
  content_type: string
  content_url?: string
  content?: string
  duration_minutes?: number
  order_index: number
  is_preview: boolean
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('lessons')
      .update({
        title: lessonData.title,
        description: lessonData.description || null,
        content_type: lessonData.content_type,
        content_url: lessonData.content_url || null,
        content: lessonData.content || null,
        duration_minutes: lessonData.duration_minutes || null,
        order_index: lessonData.order_index,
        is_preview: lessonData.is_preview,
        updated_at: new Date().toISOString()
      })
      .eq('id', lessonId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error updating lesson:', error)
    return { success: false, error: error.message || 'Erro ao atualizar aula' }
  }
}

export async function deleteLesson(lessonId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting lesson:', error)
    return { success: false, error: error.message || 'Erro ao deletar aula' }
  }
}

export async function bulkDeleteLessons(lessonIds: string[]) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    // Processar em batches de 50 para evitar limite de URL do PostgREST
    const BATCH_SIZE = 50
    for (let i = 0; i < lessonIds.length; i += BATCH_SIZE) {
      const batch = lessonIds.slice(i, i + BATCH_SIZE)
      const { error } = await supabase
        .from('lessons')
        .delete()
        .in('id', batch)

      if (error) throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error bulk deleting lessons:', error)
    return { success: false, error: error.message || 'Erro ao deletar aulas' }
  }
}

export async function toggleLessonPreview(lessonId: string, currentPreview: boolean) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('lessons')
      .update({ is_preview: !currentPreview })
      .eq('id', lessonId)

    if (error) throw error

    return { success: true, newStatus: !currentPreview }
  } catch (error: any) {
    console.error('Error toggling lesson preview:', error)
    return { success: false, error: error.message || 'Erro ao atualizar preview' }
  }
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getSubjectsData() {
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

    const { data: subjectsData, error } = await supabase
      .from('subjects')
      .select(`
        *,
        module_subjects(
          id,
          module_id,
          order_index,
          course_modules(
            id,
            title
          )
        )
      `)
      .order('code')

    if (error) throw error

    if (subjectsData && subjectsData.length > 0) {
      const { data: courseSubjects } = await supabase
        .from('course_subjects')
        .select('subject_id')

      const { data: subjectLessons } = await supabase
        .from('subject_lessons')
        .select('subject_id')

      const courseCounts: { [key: string]: number } = {}
      courseSubjects?.forEach((cs: any) => {
        courseCounts[cs.subject_id] = (courseCounts[cs.subject_id] || 0) + 1
      })

      const lessonCounts: { [key: string]: number } = {}
      subjectLessons?.forEach((sl: any) => {
        lessonCounts[sl.subject_id] = (lessonCounts[sl.subject_id] || 0) + 1
      })

      return {
        subjects: subjectsData || [],
        courseCounts,
        lessonCounts
      }
    }

    return {
      subjects: subjectsData || [],
      courseCounts: {},
      lessonCounts: {}
    }
  } catch (error) {
    console.error('Error fetching subjects data:', error)
    return null
  }
}

export async function getLessonsForSubject(subjectId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const [{ data: lessonsData, error: lessonsError }, { data: lessonLinks, error: lessonLinksError }] = await Promise.all([
      supabase.from('lessons').select('id, title, description, content_type, duration_minutes').order('title'),
      supabase.from('subject_lessons').select('subject_id, lesson_id')
    ])

    if (lessonsError) throw lessonsError
    if (lessonLinksError) throw lessonLinksError

    return {
      lessons: lessonsData || [],
      lessonLinks: lessonLinks || []
    }
  } catch (error) {
    console.error('Error fetching lessons for subject:', error)
    return null
  }
}

export async function createSubject(subjectData: {
  name: string
  code?: string
  description?: string
  hours?: number
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('subjects')
      .insert({
        name: subjectData.name,
        code: subjectData.code || null,
        description: subjectData.description || null,
        hours: subjectData.hours || null
      })

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error creating subject:', error)
    return { success: false, error: error.message || 'Erro ao criar disciplina' }
  }
}

export async function updateSubject(subjectId: string, subjectData: {
  name: string
  code?: string
  description?: string
  hours?: number
  moduleOrderIndex?: number
  subjectModuleId?: string
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('subjects')
      .update({
        name: subjectData.name,
        code: subjectData.code || null,
        description: subjectData.description || null,
        hours: subjectData.hours || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', subjectId)

    if (error) throw error

    if (subjectData.subjectModuleId && subjectData.moduleOrderIndex !== undefined) {
      const { error: orderError } = await supabase
        .from('module_subjects')
        .update({ order_index: subjectData.moduleOrderIndex })
        .eq('id', subjectData.subjectModuleId)

      if (orderError) throw orderError
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error updating subject:', error)
    return { success: false, error: error.message || 'Erro ao atualizar disciplina' }
  }
}

async function deleteByIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  column: string,
  ids: string[]
) {
  if (ids.length === 0) return

  const { error } = await (supabase as any)
    .from(table)
    .delete()
    .in(column, ids)

  if (error) {
    throw new Error(`Erro ao limpar ${table}: ${error.message}`)
  }
}

async function deleteSubjectCascade(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subjectId: string
) {
  // Busca aulas vinculadas à disciplina
  const { data: subjectLessons } = await supabase
    .from('subject_lessons')
    .select('lesson_id')
    .eq('subject_id', subjectId)

  const lessonIds: string[] = Array.from(
    new Set(
      (subjectLessons || [])
        .map((entry: any) => entry.lesson_id)
        .filter((id: any): id is string => Boolean(id))
    )
  )

  // Busca testes vinculados à disciplina
  const { data: subjectTests } = await supabase
    .from('tests')
    .select('id')
    .eq('subject_id', subjectId)

  const testIds: string[] = Array.from(
    new Set(
      (subjectTests || [])
        .map((test: any) => test.id)
        .filter((id: any): id is string => Boolean(id))
    )
  )

  // Remove em ordem de dependência
  await deleteByIds(supabase, 'test_answer_keys', 'test_id', testIds)
  await deleteByIds(supabase, 'test_attempts', 'test_id', testIds)
  await deleteByIds(supabase, 'test_grades', 'test_id', testIds)
  await deleteByIds(supabase, 'tests', 'id', testIds)

  await deleteByIds(supabase, 'lesson_progress', 'lesson_id', lessonIds)
  await deleteByIds(supabase, 'subject_lessons', 'lesson_id', lessonIds)
  await deleteByIds(supabase, 'subject_lessons', 'subject_id', [subjectId])
  await deleteByIds(supabase, 'lessons', 'id', lessonIds)

  await deleteByIds(supabase, 'module_subjects', 'subject_id', [subjectId])
  await deleteByIds(supabase, 'course_subjects', 'subject_id', [subjectId])
  await deleteByIds(supabase, 'subjects', 'id', [subjectId])
}

export async function deleteSubject(subjectId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    await deleteSubjectCascade(supabase, subjectId)

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting subject:', error)
    return { success: false, error: error.message || 'Erro ao deletar disciplina' }
  }
}

export async function bulkDeleteSubjects(subjectIds: string[]) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    // Executa cascade para cada disciplina
    for (const subjectId of subjectIds) {
      await deleteSubjectCascade(supabase, subjectId)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error bulk deleting subjects:', error)
    return { success: false, error: error.message || 'Erro ao deletar disciplinas' }
  }
}

export async function associateLessonsWithSubject(subjectId: string, lessonIds: string[]) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('subject_lessons')
      .insert(
        lessonIds.map(lessonId => ({
          subject_id: subjectId,
          lesson_id: lessonId
        }))
      )

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error associating lessons:', error)
    return { success: false, error: error.message || 'Erro ao associar aulas' }
  }
}

export async function getModuleSubject(subjectId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('module_subjects')
      .select('order_index, id')
      .eq('subject_id', subjectId)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return data
  } catch (error) {
    console.error('Error fetching module subject:', error)
    return null
  }
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getTestsData() {
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

    const { data: testsData } = await supabase
      .from('tests')
      .select('*')
      .order('created_at', { ascending: false })

    if (testsData) {
      const testsWithAnswerKeys = await Promise.all(
        testsData.map(async (test: any) => {
          const { count } = await supabase
            .from('test_answer_keys')
            .select('*', { count: 'exact', head: true })
            .eq('test_id', test.id)

          return { ...test, answer_key_count: count || 0 }
        })
      )

      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .order('title')

      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .order('name')

      const { data: modulesData } = await supabase
        .from('course_modules')
        .select('*')
        .order('title')

      return {
        tests: testsWithAnswerKeys,
        courses: coursesData || [],
        subjects: subjectsData || [],
        modules: modulesData || []
      }
    }

    return {
      tests: [],
      courses: [],
      subjects: [],
      modules: []
    }
  } catch (error) {
    console.error('Error fetching tests data:', error)
    return null
  }
}

export async function createTest(testData: {
  title: string
  description?: string
  google_drive_url: string
  course_id?: string
  module_id?: string
  subject_id?: string
  duration_minutes: number
  passing_score: number
  max_attempts: number
  is_active: boolean
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado', testId: null }
    }

    const cleanedData: any = {
      title: testData.title,
      description: testData.description || null,
      google_drive_url: testData.google_drive_url,
      duration_minutes: testData.duration_minutes || 60,
      passing_score: testData.passing_score || 70,
      max_attempts: testData.max_attempts || 3,
      is_active: testData.is_active
    }

    if (testData.course_id) cleanedData.course_id = testData.course_id
    if (testData.module_id) cleanedData.module_id = testData.module_id
    if (testData.subject_id) cleanedData.subject_id = testData.subject_id

    const { data: newTest, error } = await supabase
      .from('tests')
      .insert(cleanedData)
      .select()
      .single()

    if (error) throw error

    return { success: true, testId: newTest?.id || null }
  } catch (error: any) {
    console.error('Error creating test:', error)
    return { success: false, error: error.message || 'Erro ao criar teste', testId: null }
  }
}

export async function updateTest(testId: string, testData: {
  title: string
  description?: string
  google_drive_url: string
  course_id?: string
  module_id?: string
  subject_id?: string
  duration_minutes: number
  passing_score: number
  max_attempts: number
  is_active: boolean
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const cleanedData: any = {
      title: testData.title,
      description: testData.description || null,
      google_drive_url: testData.google_drive_url,
      duration_minutes: testData.duration_minutes || 60,
      passing_score: testData.passing_score || 70,
      max_attempts: testData.max_attempts || 3,
      is_active: testData.is_active
    }

    if (testData.course_id) cleanedData.course_id = testData.course_id
    if (testData.module_id) cleanedData.module_id = testData.module_id
    if (testData.subject_id) cleanedData.subject_id = testData.subject_id

    const { error } = await supabase
      .from('tests')
      .update(cleanedData)
      .eq('id', testId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error updating test:', error)
    return { success: false, error: error.message || 'Erro ao atualizar teste' }
  }
}

export async function deleteTest(testId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    await supabase.from('test_answer_keys').delete().eq('test_id', testId)
    await supabase.from('test_attempts').delete().eq('test_id', testId)
    await supabase.from('test_grades').delete().eq('test_id', testId)

    const { error } = await supabase
      .from('tests')
      .delete()
      .eq('id', testId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting test:', error)
    return { success: false, error: error.message || 'Erro ao deletar teste' }
  }
}

export async function bulkDeleteTests(testIds: string[]) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    await supabase.from('test_answer_keys').delete().in('test_id', testIds)
    await supabase.from('test_attempts').delete().in('test_id', testIds)
    await supabase.from('test_grades').delete().in('test_id', testIds)

    const { error } = await supabase
      .from('tests')
      .delete()
      .in('id', testIds)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error bulk deleting tests:', error)
    return { success: false, error: error.message || 'Erro ao deletar testes' }
  }
}

export async function updateTestAnswerKeys(testId: string, answerKeys: Array<{
  questionNumber: number
  correctAnswer: string
  points?: number
  justification?: string
}>) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    await supabase
      .from('test_answer_keys')
      .delete()
      .eq('test_id', testId)

    const formattedKeys = answerKeys.map(item => ({
      test_id: testId,
      question_number: item.questionNumber,
      correct_answer: item.correctAnswer,
      points: item.points || 10,
      justification: item.justification || null
    }))

    const { error } = await supabase
      .from('test_answer_keys')
      .insert(formattedKeys)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error updating answer keys:', error)
    return { success: false, error: error.message || 'Erro ao atualizar gabarito' }
  }
}

export async function getTestAnswerKeys(testId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('test_answer_keys')
      .select('*')
      .eq('test_id', testId)
      .order('question_number')

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching answer keys:', error)
    return null
  }
}

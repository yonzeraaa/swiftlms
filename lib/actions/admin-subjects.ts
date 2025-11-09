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
      .select('*')
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

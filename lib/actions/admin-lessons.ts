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

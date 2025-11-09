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

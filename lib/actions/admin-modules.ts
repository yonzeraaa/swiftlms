'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getModulesData() {
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

    const { data: modulesData, error: modulesError } = await supabase
      .from('course_modules')
      .select('*, courses!inner(id, title)')
      .order('order_index')

    if (modulesError) throw modulesError

    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .order('title')

    if (coursesError) throw coursesError

    if (modulesData && modulesData.length > 0) {
      const { data: moduleSubjects } = await supabase
        .from('module_subjects')
        .select('module_id')

      const stats: { [key: string]: { subjects: number } } = {}
      modulesData.forEach((module: any) => {
        const subjectCount = moduleSubjects?.filter((ms: any) => ms.module_id === module.id).length || 0
        stats[module.id] = { subjects: subjectCount }
      })

      return {
        modules: modulesData || [],
        courses: coursesData || [],
        moduleStats: stats
      }
    }

    return {
      modules: modulesData || [],
      courses: coursesData || [],
      moduleStats: {}
    }
  } catch (error) {
    console.error('Error fetching modules data:', error)
    return null
  }
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getCoursesData() {
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

    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select(`
        *,
        instructor:profiles!courses_instructor_id_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false })

    if (coursesError) throw coursesError

    const courseIds = coursesData?.map((course: any) => course.id) || []
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('course_id, status')
      .in('course_id', courseIds)
      .in('status', ['active', 'completed'])

    if (enrollmentError) throw enrollmentError

    const enrollmentCounts = enrollmentData?.reduce((acc: any, enrollment: any) => {
      acc[enrollment.course_id] = (acc[enrollment.course_id] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Buscar contagens de módulos, disciplinas, aulas e testes por curso
    const [
      { data: modulesData },
      { data: moduleSubjectsData },
      { data: lessonsData },
      { data: testsData }
    ] = await Promise.all([
      supabase.from('course_modules').select('course_id').in('course_id', courseIds),
      supabase.from('module_subjects').select('module_id, course_modules!inner(course_id)').in('course_modules.course_id', courseIds),
      supabase.from('lessons').select('module_id, course_modules!inner(course_id)').in('course_modules.course_id', courseIds),
      supabase.from('tests').select('course_id').in('course_id', courseIds)
    ])

    const moduleCounts: Record<string, number> = {}
    modulesData?.forEach((m: any) => {
      moduleCounts[m.course_id] = (moduleCounts[m.course_id] || 0) + 1
    })

    const subjectCounts: Record<string, number> = {}
    moduleSubjectsData?.forEach((ms: any) => {
      const cid = ms.course_modules?.course_id
      if (cid) subjectCounts[cid] = (subjectCounts[cid] || 0) + 1
    })

    const lessonCounts: Record<string, number> = {}
    lessonsData?.forEach((l: any) => {
      const cid = l.course_modules?.course_id
      if (cid) lessonCounts[cid] = (lessonCounts[cid] || 0) + 1
    })

    const testCounts: Record<string, number> = {}
    testsData?.forEach((t: any) => {
      testCounts[t.course_id] = (testCounts[t.course_id] || 0) + 1
    })

    const transformedData = coursesData?.map((course: any) => ({
      ...course,
      _count: {
        enrollments: enrollmentCounts[course.id] || 0,
        modules: moduleCounts[course.id] || 0,
        subjects: subjectCounts[course.id] || 0,
        lessons: lessonCounts[course.id] || 0,
        tests: testCounts[course.id] || 0
      }
    })) || []

    const { data: instructors } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'instructor')
      .order('full_name')

    return {
      courses: transformedData,
      instructors: instructors || []
    }
  } catch (error) {
    console.error('Error fetching courses data:', error)
    return null
  }
}

export async function getEnrolledStudents(courseId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado', students: [] }
    }

    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        user:profiles!enrollments_user_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('course_id', courseId)
      .in('status', ['active', 'completed', 'paused'])
      .order('enrolled_at', { ascending: false })

    if (error) throw error
    return { success: true, students: data || [] }
  } catch (error) {
    console.error('Error fetching enrolled students:', error)
    return { success: false, error: 'Erro ao buscar alunos', students: [] }
  }
}

export async function createCourse(courseData: {
  title: string
  description: string
  summary: string
  category: string
  difficulty: string
  duration_hours: number
  price: number
  is_featured: boolean
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const slug = courseData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    const { data, error } = await supabase
      .from('courses')
      .insert({
        ...courseData,
        instructor_id: user.id,
        is_published: false,
        slug
      })
      .select()

    if (error) throw error

    return { success: true, course: data?.[0] }
  } catch (error: any) {
    console.error('Error creating course:', error)
    return { success: false, error: error.message || 'Erro ao criar curso' }
  }
}

export async function updateCourse(courseId: string, courseData: {
  title: string
  description: string
  summary: string
  category: string
  difficulty: string
  duration_hours: number
  price: number
  is_featured: boolean
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('courses')
      .update(courseData)
      .eq('id', courseId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error updating course:', error)
    return { success: false, error: error.message || 'Erro ao atualizar curso' }
  }
}

export async function deleteCourse(courseId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting course:', error)
    return { success: false, error: error.message || 'Erro ao deletar curso' }
  }
}

export async function toggleCoursePublishStatus(courseId: string, currentStatus: boolean) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado', newStatus: null }
    }

    const { error } = await supabase
      .from('courses')
      .update({ is_published: !currentStatus })
      .eq('id', courseId)

    if (error) throw error

    return { success: true, newStatus: !currentStatus }
  } catch (error: any) {
    console.error('Error toggling publish status:', error)
    return { success: false, error: error.message || 'Erro ao alterar status', newStatus: null }
  }
}

export async function unenrollStudent(enrollmentId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', enrollmentId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error unenrolling student:', error)
    return { success: false, error: error.message || 'Erro ao desmatricular aluno' }
  }
}

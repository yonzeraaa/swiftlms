'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface ReportData {
  totalStudents: number
  totalInstructors: number
  totalCourses: number
  totalEnrollments: number
  completedCourses: number
  averageCompletionRate: number
  activeStudents: number
  coursesPerCategory: { category: string; count: number }[]
  enrollmentsByMonth: { month: string; count: number }[]
  topCourses: { title: string; enrollments: number }[]
}

/**
 * Get report data for a specific date range
 * SECURITY: Server-side only, no token exposure
 */
export async function getReportData(startDate: string, endDate: string): Promise<ReportData | null> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    // Check if user is admin or instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      redirect('/student-dashboard')
    }

    // Fetch profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')

    const students = profiles?.filter((p: any) => p.role === 'student') || []
    const instructors = profiles?.filter((p: any) => p.role === 'instructor') || []
    const activeStudents = students.filter((s: any) => s.status === 'active').length

    // Fetch courses
    const { data: courses } = await supabase
      .from('courses')
      .select('*')

    // Fetch enrollments
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*')
      .gte('enrolled_at', startDate)
      .lte('enrolled_at', endDate)
      .in('status', ['active', 'completed'])

    const completedCourses = enrollments?.filter((e: any) => e.status === 'completed').length || 0
    const totalEnrollments = enrollments?.length || 0
    const averageCompletionRate = totalEnrollments > 0
      ? Math.round((completedCourses / totalEnrollments) * 100)
      : 0

    // Courses per category
    const categoryMap = new Map<string, number>()
    courses?.forEach((course: any) => {
      const count = categoryMap.get(course.category) || 0
      categoryMap.set(course.category, count + 1)
    })
    const coursesPerCategory = Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      count
    }))

    // Enrollments by month
    const monthMap = new Map<string, number>()
    enrollments?.forEach((enrollment: any) => {
      if (enrollment.enrolled_at) {
        const date = new Date(enrollment.enrolled_at)
        const month = date.toLocaleDateString('pt-BR', {
          month: 'short',
          year: 'numeric'
        })
        const count = monthMap.get(month) || 0
        monthMap.set(month, count + 1)
      }
    })
    const enrollmentsByMonth = Array.from(monthMap.entries()).map(([month, count]) => ({
      month,
      count
    }))

    // Top courses
    const courseEnrollmentMap = new Map<string, { title: string; count: number }>()
    enrollments?.forEach((enrollment: any) => {
      const course = courses?.find((c: any) => c.id === enrollment.course_id)
      if (course) {
        const existing = courseEnrollmentMap.get(course.id) || { title: course.title, count: 0 }
        courseEnrollmentMap.set(course.id, {
          title: course.title,
          count: existing.count + 1
        })
      }
    })
    const topCourses = Array.from(courseEnrollmentMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(({ title, count }) => ({ title, enrollments: count }))

    return {
      totalStudents: students.length,
      totalInstructors: instructors.length,
      totalCourses: courses?.length || 0,
      totalEnrollments,
      completedCourses,
      averageCompletionRate,
      activeStudents,
      coursesPerCategory,
      enrollmentsByMonth,
      topCourses
    }
  } catch (error) {
    console.error('Error fetching report data:', error)
    return null
  }
}

/**
 * Get active Excel templates
 * SECURITY: Server-side only, no token exposure
 */
export async function getReportTemplates() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    // Check if user is admin or instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      redirect('/student-dashboard')
    }

    const { data } = await supabase
      .from('excel_templates')
      .select('*')
      .eq('is_active', true)
      .order('name')

    return data || []
  } catch (error) {
    console.error('Error fetching templates:', error)
    return []
  }
}

/**
 * Get active students for reports
 * SECURITY: Server-side only, no token exposure
 */
export async function getStudentsForReport() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    // Check if user is admin or instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      redirect('/student-dashboard')
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .eq('status', 'active')
      .order('full_name')

    return data || []
  } catch (error) {
    console.error('Error fetching students:', error)
    return []
  }
}

/**
 * Get courses for a specific student
 * SECURITY: Server-side only, no token exposure
 */
export async function getStudentCourses(studentId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    // Check if user is admin or instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      redirect('/student-dashboard')
    }

    const { data } = await supabase
      .from('enrollments')
      .select('id, course_id, courses(title)')
      .eq('user_id', studentId)
      .order('enrolled_at', { ascending: false })

    if (data) {
      return data.map((item: any) => ({
        enrollment_id: item.id,
        course_id: item.course_id,
        course_title: item.courses?.title || 'Unknown Course'
      }))
    }

    return []
  } catch (error) {
    console.error('Error fetching student courses:', error)
    return []
  }
}

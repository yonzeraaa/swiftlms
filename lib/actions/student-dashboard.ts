'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Database } from '@/lib/database.types'

type Course = Database['public']['Tables']['courses']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']

interface EnrolledCourse extends Course {
  enrollment: Enrollment
  progress: number
  lastAccessed?: string
}

interface StudentStats {
  enrolledCourses: number
  completedCourses: number
  hoursLearned: number
  certificates: number
  currentStreak: number
  overallProgress: number
}

interface RecentActivity {
  id: string
  type: 'lesson_completed' | 'course_started' | 'achievement'
  description: string
  timestamp: string
  icon: 'lesson' | 'course' | 'achievement'
}

interface StudentDashboardData {
  stats: StudentStats
  enrolledCourses: EnrolledCourse[]
  recentActivities: RecentActivity[]
}

/**
 * Server action to fetch all student dashboard data
 * SECURITY: Runs server-side only, no token exposure to client
 */
export async function getStudentDashboardData(): Promise<StudentDashboardData | null> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      redirect('/')
    }

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Allow students, admins, and instructors (with view mode)
    if (profile?.role !== 'student' && profile?.role !== 'admin' && profile?.role !== 'instructor') {
      redirect('/')
    }

    // Fetch enrollments with course details
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        *,
        courses (
          id,
          title,
          description,
          thumbnail_url,
          duration_hours,
          level,
          created_at,
          updated_at,
          published,
          category
        )
      `)
      .eq('student_id', user.id)
      .eq('status', 'active')

    // Process enrolled courses with progress
    const enrolledCourses: EnrolledCourse[] = await Promise.all(
      (enrollments || []).map(async (enrollment: any) => {
        const course = enrollment.courses

        // Calculate progress
        const { data: lessons } = await supabase
          .from('lessons')
          .select('id')
          .eq('course_id', course.id)

        const { data: completedLessons } = await supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('student_id', user.id)
          .eq('completed', true)
          .in('lesson_id', (lessons || []).map((l: any) => l.id))

        const totalLessons = lessons?.length || 0
        const completed = completedLessons?.length || 0
        const progress = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0

        return {
          ...course,
          enrollment,
          progress,
          lastAccessed: enrollment.updated_at
        }
      })
    )

    // Calculate stats
    const { data: certificates } = await supabase
      .from('certificates')
      .select('id')
      .eq('student_id', user.id)

    const completedCourses = enrolledCourses.filter(c => c.progress === 100).length
    const totalProgress = enrolledCourses.length > 0
      ? Math.round(enrolledCourses.reduce((sum, c) => sum + c.progress, 0) / enrolledCourses.length)
      : 0

    // Fetch recent activities
    const { data: lessonProgress } = await supabase
      .from('lesson_progress')
      .select(`
        id,
        completed_at,
        lessons!inner (
          title,
          courses!inner (
            title
          )
        )
      `)
      .eq('student_id', user.id)
      .eq('completed', true)
      .order('completed_at', { ascending: false })
      .limit(5)

    const recentActivities: RecentActivity[] = (lessonProgress || []).map((lp: any) => ({
      id: lp.id,
      type: 'lesson_completed' as const,
      description: `Completed "${lp.lessons.title}" in ${lp.lessons.courses.title}`,
      timestamp: lp.completed_at,
      icon: 'lesson' as const
    }))

    const stats: StudentStats = {
      enrolledCourses: enrolledCourses.length,
      completedCourses,
      hoursLearned: enrolledCourses.reduce((sum, c) => sum + (c.duration_hours || 0), 0),
      certificates: certificates?.length || 0,
      currentStreak: 0, // TODO: Calculate actual streak
      overallProgress: totalProgress
    }

    return {
      stats,
      enrolledCourses,
      recentActivities
    }
  } catch (error) {
    console.error('Error fetching student dashboard data:', error)
    return null
  }
}

/**
 * Server action to fetch enrolled courses
 */
export async function getEnrolledCourses(): Promise<EnrolledCourse[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        *,
        courses (*)
      `)
      .eq('student_id', user.id)
      .eq('status', 'active')

    const enrolledCourses: EnrolledCourse[] = await Promise.all(
      (enrollments || []).map(async (enrollment: any) => {
        const course = enrollment.courses

        const { data: lessons } = await supabase
          .from('lessons')
          .select('id')
          .eq('course_id', course.id)

        const { data: completedLessons } = await supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('student_id', user.id)
          .eq('completed', true)
          .in('lesson_id', (lessons || []).map((l: any) => l.id))

        const totalLessons = lessons?.length || 0
        const completed = completedLessons?.length || 0
        const progress = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0

        return {
          ...course,
          enrollment,
          progress,
          lastAccessed: enrollment.updated_at
        }
      })
    )

    return enrolledCourses
  } catch (error) {
    console.error('Error fetching enrolled courses:', error)
    return []
  }
}

/**
 * Server action to fetch available courses
 */
export async function getAvailableCourses() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // Get all published courses
    const { data: allCourses } = await supabase
      .from('courses')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })

    // Get user's enrollments
    const { data: userEnrollments } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('student_id', user.id)

    const enrolledCourseIds = new Set((userEnrollments || []).map((e: any) => e.course_id))

    // Filter out enrolled courses
    const availableCourses = (allCourses || []).filter(
      course => !enrolledCourseIds.has(course.id)
    )

    return availableCourses
  } catch (error) {
    console.error('Error fetching available courses:', error)
    return []
  }
}

/**
 * Server action to fetch student grades
 */
export async function getStudentGrades() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: grades } = await supabase
      .from('test_attempts')
      .select(`
        *,
        tests!inner (
          title,
          total_points,
          subjects!inner (
            title,
            courses!inner (
              title
            )
          )
        )
      `)
      .eq('student_id', user.id)
      .order('submitted_at', { ascending: false })

    return grades
  } catch (error) {
    console.error('Error fetching student grades:', error)
    return null
  }
}

/**
 * Server action to fetch student certificates
 */
export async function getStudentCertificates() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: certificates } = await supabase
      .from('certificates')
      .select(`
        *,
        courses (
          title,
          description
        )
      `)
      .eq('student_id', user.id)
      .order('issued_at', { ascending: false })

    return certificates || []
  } catch (error) {
    console.error('Error fetching student certificates:', error)
    return []
  }
}

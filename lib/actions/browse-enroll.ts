'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Get all user enrollments with courses
 * SECURITY: Server-side only, no token exposure
 */
export async function getMyEnrollments() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        courses (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching enrollments:', error)
      return []
    }

    // For each enrollment, get modules and progress
    const enrichedEnrollments = await Promise.all(
      (enrollments || []).map(async (enrollment: any) => {
        const courseId = enrollment.course_id

        // Get course modules with subjects and lessons
        const { data: modules } = await supabase
          .from('course_modules')
          .select(`
            *,
            module_subjects (
              subjects (
                *,
                lessons (*)
              )
            )
          `)
          .eq('course_id', courseId)
          .order('order_index')

        // Get enrollment modules (what modules student has access to)
        const { data: enrollmentModules } = await supabase
          .from('enrollment_modules')
          .select('module_id')
          .eq('enrollment_id', enrollment.id)

        // Get lesson progress
        const { data: progress } = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('user_id', user.id)

        return {
          ...enrollment,
          modules: modules || [],
          enrollmentModules: enrollmentModules || [],
          progress: progress || []
        }
      })
    )

    return enrichedEnrollments
  } catch (error) {
    console.error('Error fetching my enrollments:', error)
    return []
  }
}

/**
 * Get all available courses for browsing/enrollment
 * SECURITY: Server-side only, no token exposure
 */
export async function getBrowsableCourses() {
  try {
    const supabase = await createClient()

    // Get user (may be null for public browsing)
    const { data: { user } } = await supabase.auth.getUser()

    // Get all published courses
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching courses:', error)
      return []
    }

    // Get instructors
    const instructorIds = [...new Set(courses?.map((c: any) => c.instructor_id).filter(Boolean))]
    const { data: instructors } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', instructorIds)

    // Get user's enrollments if authenticated
    let userEnrollments: any[] = []
    if (user) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user.id)
      userEnrollments = enrollments || []
    }

    // Get all enrollments count for each course
    const { data: allEnrollments } = await supabase
      .from('enrollments')
      .select('course_id')

    // Get reviews for each course
    const { data: reviews } = await supabase
      .from('course_reviews')
      .select('course_id, rating')

    // Get course modules for preview
    const courseIds = courses?.map((c: any) => c.id) || []
    const { data: modules } = await supabase
      .from('course_modules')
      .select(`
        id,
        course_id,
        title,
        module_subjects (
          subjects (
            title,
            lessons (id, title)
          )
        )
      `)
      .in('course_id', courseIds)

    return {
      courses: courses || [],
      instructors: instructors || [],
      userEnrollments,
      allEnrollments: allEnrollments || [],
      reviews: reviews || [],
      modules: modules || []
    }
  } catch (error) {
    console.error('Error fetching browsable courses:', error)
    return {
      courses: [],
      instructors: [],
      userEnrollments: [],
      allEnrollments: [],
      reviews: [],
      modules: []
    }
  }
}

/**
 * Get student dashboard data
 * SECURITY: Server-side only, no token exposure
 */
export async function getStudentDashboardData() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Get enrollments
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`*, courses (*)`)
      .eq('user_id', user.id)

    // Get progress stats using RPC
    const { data: stats } = await supabase
      .rpc('get_user_progress_stats', { user_id_param: user.id })

    // Get recent lesson progress
    const { data: recentProgress } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('last_accessed_at', { ascending: false })
      .limit(10)

    // Get recent activity logs
    const { data: activities } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return {
      profile,
      enrollments: enrollments || [],
      stats,
      recentProgress: recentProgress || [],
      activities: activities || []
    }
  } catch (error) {
    console.error('Error fetching student dashboard data:', error)
    return null
  }
}

/**
 * Get course progress detail
 * SECURITY: Server-side only, no token exposure
 */
export async function getCourseProgressDetail(courseId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    // Get course
    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()

    // Get enrollment
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single()

    // Get enrollment modules
    const { data: enrollmentModules } = await supabase
      .from('enrollment_modules')
      .select('*')
      .eq('enrollment_id', enrollment?.id || '')

    // Get modules with lessons
    const { data: modules } = await supabase
      .from('course_modules')
      .select(`
        *,
        lessons (*)
      `)
      .eq('course_id', courseId)
      .order('order_index')

    // Get lesson progress
    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)

    return {
      course,
      enrollment,
      enrollmentModules: enrollmentModules || [],
      modules: modules || [],
      progress: progress || []
    }
  } catch (error) {
    console.error('Error fetching course progress detail:', error)
    return null
  }
}

/**
 * Get overall student progress
 * SECURITY: Server-side only, no token exposure
 */
export async function getStudentProgress() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    // Get all enrollments
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`*, courses (*)`)
      .eq('user_id', user.id)

    // Get enrollment modules for all enrollments
    const enrollmentIds = enrollments?.map((e: any) => e.id) || []
    const { data: enrollmentModules } = await supabase
      .from('enrollment_modules')
      .select('*')
      .in('enrollment_id', enrollmentIds)

    // Get course modules
    const courseIds = enrollments?.map((e: any) => e.course_id) || []
    const { data: modules } = await supabase
      .from('course_modules')
      .select(`
        *,
        lessons (*)
      `)
      .in('course_id', courseIds)
      .order('order_index')

    // Get lesson progress
    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)

    return {
      enrollments: enrollments || [],
      enrollmentModules: enrollmentModules || [],
      modules: modules || [],
      progress: progress || []
    }
  } catch (error) {
    console.error('Error fetching student progress:', error)
    return null
  }
}

/**
 * Get calendar data (courses and tests)
 * SECURITY: Server-side only, no token exposure
 */
export async function getCalendarData() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    // Get enrollments with courses
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`*, courses (*)`)
      .eq('user_id', user.id)

    // Get tests from enrolled courses
    const courseIds = enrollments?.map((e: any) => e.course_id) || []
    const { data: tests } = await supabase
      .from('tests')
      .select('*')
      .in('course_id', courseIds)

    return {
      enrollments: enrollments || [],
      tests: tests || []
    }
  } catch (error) {
    console.error('Error fetching calendar data:', error)
    return {
      enrollments: [],
      tests: []
    }
  }
}

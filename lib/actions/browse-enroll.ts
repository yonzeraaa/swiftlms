'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Check if user is authenticated and get their role
 * SECURITY: Server-side only, no token exposure
 */
export async function checkAuthStatus() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return { isAuthenticated: false, role: null }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    return {
      isAuthenticated: true,
      role: profile?.role || null
    }
  } catch (error) {
    console.error('Error checking auth status:', error)
    return { isAuthenticated: false, role: null }
  }
}

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
        course:courses(*)
      `)
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false })

    if (error) {
      console.error('Error fetching enrollments:', error)
      return { success: false, data: [], error: error.message }
    }

    if (!enrollments) {
      return { success: true, data: [] }
    }

    // For each enrollment, get modules and progress
    const coursesWithDetails = await Promise.all(
      enrollments.map(async (enrollment: any) => {
        if (!enrollment.course) return null

        const courseId = enrollment.course.id

        // Get course modules with subjects and lessons
        const { data: modules } = await supabase
          .from('course_modules')
          .select(`
            *,
            module_subjects (
              subject:subjects (
                *,
                subject_lessons (
                  lesson:lessons (*)
                )
              ),
              order_index
            )
          `)
          .eq('course_id', courseId)
          .order('order_index')

        // Get enrollment modules (what modules student has access to)
        const { data: enrollmentModules } = await supabase
          .from('enrollment_modules')
          .select('module_id')
          .eq('enrollment_id', enrollment.id)

        // Get lesson progress for this enrollment
        const { data: lessonProgress } = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('enrollment_id', enrollment.id)

        // Calculate totals
        let totalLessons = 0
        let completedLessons = 0
        let nextLesson = null
        const allowedModuleIds = enrollmentModules?.map((em: any) => em.module_id).filter(Boolean) || null

        const filteredModules = modules && allowedModuleIds !== null
          ? modules.filter((module: any) => allowedModuleIds.includes(module.id))
          : modules || []

        for (const module of filteredModules) {
          const moduleSubjects = (module as any).module_subjects || []
          moduleSubjects.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))

          for (const moduleSubject of moduleSubjects) {
            if (moduleSubject.subject && moduleSubject.subject.subject_lessons) {
              for (const subjectLesson of moduleSubject.subject.subject_lessons) {
                if (subjectLesson.lesson) {
                  const lesson = subjectLesson.lesson
                  totalLessons++

                  const progress = lessonProgress?.find((lp: any) => lp.lesson_id === lesson.id)
                  if (progress?.is_completed) {
                    completedLessons++
                  } else if (!nextLesson) {
                    nextLesson = lesson
                  }
                }
              }
            }
          }
        }

        return {
          ...enrollment.course,
          enrollment: enrollment,
          modules: filteredModules,
          totalLessons,
          completedLessons,
          nextLesson
        }
      })
    )

    return {
      success: true,
      data: coursesWithDetails.filter(Boolean),
      userId: user.id
    }
  } catch (error) {
    console.error('Error fetching my enrollments:', error)
    return { success: false, data: [], error: 'Erro ao carregar cursos' }
  }
}

/**
 * Get all available courses for browsing/enrollment
 * SECURITY: Server-side only, no token exposure
 */
export async function getBrowsableCourses() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching courses:', error)
      return {
        courses: [],
        instructors: [],
        userEnrollments: [],
        allEnrollments: [],
        reviews: [],
        modules: []
      }
    }

    const instructorIds = [...new Set(courses?.map((c: any) => c.instructor_id).filter(Boolean))]
    const { data: instructors } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', instructorIds)

    let userEnrollments: any[] = []
    if (user) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user.id)
      userEnrollments = enrollments || []
    }

    const { data: allEnrollments } = await supabase
      .from('enrollments')
      .select('course_id')

    const { data: reviews } = await supabase
      .from('course_reviews')
      .select('course_id, rating')

    const courseIds = courses?.map((c: any) => c.id) || []
    const { data: modules } = await supabase
      .from('course_modules')
      .select(`
        id,
        course_id,
        title,
        description,
        order_index,
        module_subjects (
          order_index,
          subject:subjects (
            id,
            name,
            title,
            description,
            code,
            hours
          )
        )
      `)
      .in('course_id', courseIds)
      .order('order_index')

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

    // Get enrollments with courses
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`*, course:courses (*)`)
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false })

    // Get progress stats using RPC
    const { data: stats } = await supabase
      .rpc('get_user_progress_stats', { p_user_id: user.id })
      .single()

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
      .limit(5)

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
      .order('enrolled_at', { ascending: false })

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
        id,
        course_id,
        title,
        order_index
      `)
      .in('course_id', courseIds)
      .order('order_index')

    // Get all lessons
    const moduleIds = modules?.map((m: any) => m.id) || []
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, module_id')
      .in('module_id', moduleIds)

    // Get lesson progress
    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)

    // Get progress stats using RPC
    const { data: stats } = await supabase
      .rpc('get_user_progress_stats', { p_user_id: user.id })
      .single()

    // Get weekly progress (last 7 days)
    const { data: weeklyProgress } = await supabase
      .from('lesson_progress')
      .select('completed_at')
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .gte('completed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    return {
      enrollments: enrollments || [],
      enrollmentModules: enrollmentModules || [],
      modules: modules || [],
      lessons: lessons || [],
      progress: progress || [],
      stats: stats || null,
      weeklyProgress: weeklyProgress || []
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

/**
 * Get course preview modules
 * SECURITY: Server-side only, no token exposure
 */
export async function getCoursePreview(courseId: string) {
  try {
    const supabase = await createClient()

    // Fetch modules with preview lessons
    const { data: modules, error } = await supabase
      .from('course_modules')
      .select(`
        *,
        module_subjects!inner(
          *,
          subjects(
            *,
            subject_lessons(
              *,
              lessons!inner(
                *
              )
            )
          )
        )
      `)
      .eq('course_id', courseId)
      .order('order_index')

    if (error) {
      console.error('Error fetching course preview:', error)
      return []
    }

    // Filter only preview lessons
    if (modules) {
      const modulesWithPreview = modules.map((module: any) => ({
        ...module,
        module_subjects: module.module_subjects?.map((ms: any) => ({
          ...ms,
          subjects: {
            ...ms.subjects,
            subject_lessons: ms.subjects?.subject_lessons?.filter((sl: any) =>
              sl.lessons?.is_preview === true
            ) || []
          }
        })).filter((ms: any) => ms.subjects?.subject_lessons?.length > 0)
      })).filter((m: any) => m.module_subjects?.length > 0)

      return modulesWithPreview
    }

    return []
  } catch (error) {
    console.error('Error fetching course preview:', error)
    return []
  }
}

/**
 * Update enrollment progress and status
 * SECURITY: Server-side only, no token exposure
 */
export async function updateEnrollmentProgressAndStatus(
  enrollmentId: string,
  progressPercentage: number,
  courseId: string
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const isCompleted = progressPercentage === 100
    const updateData: any = {
      progress_percentage: progressPercentage,
      updated_at: new Date().toISOString()
    }

    if (isCompleted) {
      updateData.status = 'completed'
      updateData.completed_at = new Date().toISOString()
    }

    const { data: updatedEnrollment, error } = await supabase
      .from('enrollments')
      .update(updateData)
      .eq('id', enrollmentId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating enrollment:', error)
      return { success: false, error: error.message }
    }

    // Generate certificate if course is completed
    if (isCompleted) {
      const { data: existingCert } = await supabase
        .from('certificates')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single()

      if (!existingCert) {
        const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
        const verificationCode = Math.random().toString(36).substr(2, 16).toUpperCase()

        const { data: course } = await supabase
          .from('courses')
          .select('duration_hours')
          .eq('id', courseId)
          .single()

        await supabase
          .from('certificates')
          .insert({
            user_id: user.id,
            course_id: courseId,
            enrollment_id: enrollmentId,
            certificate_number: certificateNumber,
            verification_code: verificationCode,
            course_hours: course?.duration_hours || 0,
            grade: 100,
            issued_at: new Date().toISOString(),
            instructor_name: 'SwiftEDU'
          })
      }
    }

    return { success: true, enrollment: updatedEnrollment }
  } catch (error: any) {
    console.error('Error updating enrollment progress:', error)
    return { success: false, error: error?.message || 'Erro desconhecido' }
  }
}

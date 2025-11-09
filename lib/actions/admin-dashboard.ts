'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Get admin dashboard data
 * SECURITY: Server-side only, no token exposure
 */
export async function getAdminDashboardData() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      redirect('/student-dashboard')
    }

    // Get all users with statistics
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    // Get all courses
    const { data: courses } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })

    // Get all enrollments
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*')

    // Get recent activity logs with user profile
    const { data: activities } = await supabase
      .from('activity_logs')
      .select(`
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        entity_name,
        metadata,
        created_at,
        user:profiles!activity_logs_user_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false})
      .limit(50)

    // Calculate statistics
    const totalStudents = profiles?.filter((p: any) => p.role === 'student').length || 0
    const totalInstructors = profiles?.filter((p: any) => p.role === 'instructor').length || 0
    const publishedCourses = courses?.filter((c: any) => c.is_published).length || 0
    const completedEnrollments = enrollments?.filter((e: any) => e.status === 'completed').length || 0
    const totalEnrollments = enrollments?.length || 0
    const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0

    const stats = {
      totalStudents,
      totalInstructors,
      totalCourses: courses?.length || 0,
      publishedCourses,
      totalEnrollments,
      completedEnrollments,
      completionRate,
      activeUsers: profiles?.filter((p: any) => p.status === 'active').length || 0
    }

    // Course popularity (enrollments per course)
    const coursePopularity = courses?.map((course: any) => ({
      ...course,
      enrollmentCount: enrollments?.filter((e: any) => e.course_id === course.id).length || 0
    })) || []

    // Completion rates
    const completionRates = enrollments?.map((enrollment: any) => ({
      ...enrollment,
      progress: enrollment.progress || 0
    })) || []

    // Helper function to determine icon based on entity_type and action
    const getActivityIcon = (entityType: string, action: string): 'user' | 'course' | 'enrollment' | 'award' => {
      // Certificate-related actions
      if (entityType === 'certificate' || entityType === 'certificate_request' || action.includes('certificate')) {
        return 'award'
      }
      // Course-related actions
      if (entityType === 'course' || action.includes('course')) {
        return 'course'
      }
      // Enrollment-related actions
      if (entityType === 'enrollment' || action.includes('enroll')) {
        return 'enrollment'
      }
      // User-related actions
      if (entityType === 'user' || action.includes('user')) {
        return 'user'
      }
      // Lesson-related actions
      if (entityType === 'lesson') {
        return 'course'
      }
      // Default fallback
      return 'user'
    }

    // Transform activities to include formatted fields expected by the client
    const formattedActivities = activities?.map((activity: any) => ({
      id: activity.id,
      userId: activity.user_id,
      userName: activity.user?.full_name || 'Usuário desconhecido',
      action: activity.action,
      entityName: activity.entity_name,
      entityType: activity.entity_type,
      metadata: activity.metadata,
      timestamp: activity.created_at,
      created_at: activity.created_at,
      icon: getActivityIcon(activity.entity_type, activity.action)
    })) || []

    return {
      profiles: profiles || [],
      courses: courses || [],
      enrollments: enrollments || [],
      activities: formattedActivities,
      stats,
      coursePopularity,
      completionRates
    }
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error)
    return null
  }
}

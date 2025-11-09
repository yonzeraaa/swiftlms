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

    // Get recent activity logs
    const { data: activities } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false})
      .limit(50)

    // Calculate statistics
    const stats = {
      totalUsers: profiles?.length || 0,
      totalCourses: courses?.length || 0,
      totalEnrollments: enrollments?.length || 0,
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

    return {
      profiles: profiles || [],
      courses: courses || [],
      enrollments: enrollments || [],
      activities: activities || [],
      stats,
      coursePopularity,
      completionRates
    }
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error)
    return null
  }
}

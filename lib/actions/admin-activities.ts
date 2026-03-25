'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Database } from '@/lib/database.types'
import { resolveActivityEntityName } from '@/lib/utils/activity-log-display'

type ActivityLog = Database['public']['Tables']['activity_logs']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface ActivityWithUser extends ActivityLog {
  user?: Profile
}

export async function getActivitiesData(startDate: string, endDate: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      redirect('/dashboard')
    }

    // Fetch activities within date range
    const { data: activityLogs, error } = await supabase
      .from('activity_logs')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', `${endDate}T23:59:59`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching activities:', error)
      return { success: false, error: error.message, activities: [] }
    }

    if (activityLogs && activityLogs.length > 0) {
      const courseIds = [...new Set(
        activityLogs
          .filter((log: any) => log.action === 'enroll_students' && typeof log.entity_id === 'string')
          .map((log: any) => log.entity_id as string)
      )]

      // Fetch user profiles for all activities
      const userIds = [...new Set(activityLogs.map((log: any) => log.user_id).filter((id: any): id is string => id !== null))]
      const [
        { data: userProfiles },
        { data: courses },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .in('id', userIds),
        courseIds.length > 0
          ? supabase
              .from('courses')
              .select('id, title')
              .in('id', courseIds)
          : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
      ])

      const userMap = new Map(userProfiles?.map((user: any) => [user.id, user]) || [])
      const courseTitlesById = new Map(courses?.map((course: any) => [course.id, course.title]) || [])

      // Combine activities with user data
      const activitiesWithUsers: ActivityWithUser[] = activityLogs.map((log: any) => ({
        ...log,
        entity_name: resolveActivityEntityName(log, courseTitlesById),
        user: userMap.get(log.user_id!)
      }))

      return { success: true, activities: activitiesWithUsers }
    }

    return { success: true, activities: [] }
  } catch (error) {
    console.error('Error fetching activities:', error)
    return { success: false, error: 'Erro ao buscar atividades', activities: [] }
  }
}

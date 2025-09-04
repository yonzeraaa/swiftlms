'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Users, BookOpen, GraduationCap, TrendingUp, Clock, Award, Activity, FileText, UserPlus, BookPlus, ArrowUpRight, Sparkles } from 'lucide-react'
import StatCard from '../components/StatCard'
import Card from '../components/Card'
import Button from '../components/Button'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { useTranslation } from '../contexts/LanguageContext'
import { SkeletonStatCard } from '../components/Skeleton'

type Profile = Database['public']['Tables']['profiles']['Row']
type Course = Database['public']['Tables']['courses']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']

interface Stats {
  totalStudents: number
  totalInstructors: number
  totalCourses: number
  publishedCourses: number
  totalEnrollments: number
  completedEnrollments: number
  completionRate: number
  activeUsers: number
}

interface RecentActivity {
  userId: string
  userName: string
  action: string
  entityName?: string
  timestamp: string
  icon: 'user' | 'course' | 'enrollment' | 'award'
}

interface PopularCourse {
  id: string
  name: string
  students: number
  percentage: number
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalInstructors: 0,
    totalCourses: 0,
    publishedCourses: 0,
    totalEnrollments: 0,
    completedEnrollments: 0,
    completionRate: 0,
    activeUsers: 0
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [popularCourses, setPopularCourses] = useState<PopularCourse[]>([])
  const supabase = createClient()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch users statistics
      const { data: profiles } = await supabase
        .from('profiles')
        .select('role, status, created_at')

      const students = profiles?.filter((p: any) => p.role === 'student') || []
      const instructors = profiles?.filter((p: any) => p.role === 'instructor') || []
      const activeUsers = profiles?.filter((p: any) => p.status === 'active') || []

      // Fetch courses
      const { data: courses } = await supabase
        .from('courses')
        .select('*')

      const totalCourses = courses?.length || 0
      const publishedCourses = courses?.filter((c: any) => c.is_published === true).length || 0

      // Fetch enrollments with full data
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('*')
        .in('status', ['active', 'completed'])

      const totalEnrollments = enrollments?.length || 0
      const completedEnrollments = enrollments?.filter((e: any) => e.status === 'completed').length || 0
      const completionRate = totalEnrollments > 0 
        ? Math.round((completedEnrollments / totalEnrollments) * 100) 
        : 0

      // Calculate popular courses
      const courseEnrollmentMap = new Map<string, number>()
      enrollments?.forEach((enrollment: any) => {
        const count = courseEnrollmentMap.get(enrollment.course_id) || 0
        courseEnrollmentMap.set(enrollment.course_id, count + 1)
      })

      const popularCoursesData: PopularCourse[] = []
      let maxEnrollments = 0
      
      courses?.forEach((course: any) => {
        const enrollmentCount = courseEnrollmentMap.get(course.id) || 0
        if (enrollmentCount > 0) {
          maxEnrollments = Math.max(maxEnrollments, enrollmentCount)
          popularCoursesData.push({
            id: course.id,
            name: course.title,
            students: enrollmentCount,
            percentage: 0
          })
        }
      })

      // Calculate percentages and sort
      popularCoursesData.forEach((course: any) => {
        course.percentage = maxEnrollments > 0 
          ? Math.round((course.students / maxEnrollments) * 100)
          : 0
      })
      
      popularCoursesData.sort((a, b) => b.students - a.students)
      setPopularCourses(popularCoursesData.slice(0, 4))

      // Fetch recent activities from activity_logs
      const { data: activityLogs, error: activityError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
        
      if (activityError) {
        console.error('Error fetching activities:', activityError)
      }

      const activities: RecentActivity[] = []
      
      if (activityLogs && activityLogs.length > 0) {
        // Fetch user profiles for all activities
        const userIds = [...new Set(activityLogs.map((log: any) => log.user_id).filter((id: any): id is string => id !== null))]
        const { data: userProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds)
        
        const userMap = new Map(userProfiles?.map((user: any) => [user.id, user]) || [])

        for (const log of activityLogs) {
          const date = new Date(log.created_at)
          const now = new Date()
          const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
          
          let timeAgo = ''
          if (diffInMinutes < 60) {
            timeAgo = `${diffInMinutes} ${t('dashboard.minutesAgo')}`
          } else if (diffInMinutes < 1440) {
            timeAgo = `${Math.floor(diffInMinutes / 60)} ${t('dashboard.hoursAgo')}`
          } else {
            timeAgo = `${Math.floor(diffInMinutes / 1440)} ${t('dashboard.daysAgo')}`
          }

          // Get user info from the map
          const user: any = log.user_id ? userMap.get(log.user_id) : undefined
          if (!user && log.user_id) {
            console.warn('User not found for activity:', log.user_id)
            // Still show the activity with user_id as fallback
            activities.push({
              userId: log.user_id,
              userName: 'Unknown User',
              action: log.action,
              entityName: log.entity_name || undefined,
              timestamp: timeAgo,
              icon: 'enrollment'
            })
            continue
          }

          let actionText = ''
          let icon: 'user' | 'course' | 'enrollment' | 'award' = 'enrollment'
          
          switch (log.action) {
            case 'user_created':
              actionText = t('dashboard.userJoined')
              icon = 'user'
              break
            case 'course_created':
              actionText = t('dashboard.createdCourse')
              icon = 'course'
              break
            case 'course_published':
              actionText = t('dashboard.publishedCourse')
              icon = 'course'
              break
            case 'enrolled_in_course':
              actionText = t('dashboard.enrolledInCourse')
              icon = 'enrollment'
              break
            case 'student_enrolled':
              actionText = t('dashboard.newStudentEnrolled')
              icon = 'enrollment'
              break
            case 'completed_course':
              actionText = t('dashboard.completedCourse')
              icon = 'award'
              break
            default:
              actionText = log.action
          }

          activities.push({
            userId: user?.id || log.user_id || '',
            userName: user ? (user.full_name || user.email) : 'Unknown User',
            action: actionText,
            entityName: log.entity_name || undefined,
            timestamp: timeAgo,
            icon
          })
        }
      }

      console.log('Total activities found:', activityLogs?.length || 0)
      console.log('Activities processed:', activities.length)
      setRecentActivities(activities.slice(0, 5))

      // Set stats
      setStats({
        totalStudents: students.length,
        totalInstructors: instructors.length,
        totalCourses,
        publishedCourses,
        totalEnrollments,
        completedEnrollments,
        completionRate,
        activeUsers: activeUsers.length
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statsCards = [
    {
      title: t('dashboard.totalStudents'),
      value: stats.totalStudents.toString(),
      icon: <Users className="w-6 h-6" />,
      subtitle: `${stats.activeUsers} ${t('dashboard.active')}`
    },
    {
      title: t('dashboard.activeCourses'),
      value: stats.publishedCourses.toString(),
      icon: <BookOpen className="w-6 h-6" />,
      subtitle: `${stats.totalCourses} ${t('dashboard.total')}`
    },
    {
      title: t('dashboard.completionRate'),
      value: `${stats.completionRate}%`,
      icon: <GraduationCap className="w-6 h-6" />,
      subtitle: `${stats.completedEnrollments} ${t('dashboard.completed')}`
    },
    {
      title: t('dashboard.enrollments'),
      value: stats.totalEnrollments.toString(),
      icon: <TrendingUp className="w-6 h-6" />,
      subtitle: t('dashboard.totalEnrollments')
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-48 bg-navy-700/50 rounded-lg animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-navy-700/30 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>

        {/* Content Grid Skeleton */}
        <div className="bg-navy-800/50 rounded-xl p-6 animate-pulse">
          <div className="h-6 w-32 bg-navy-700/50 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-navy-700/30 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card variant="gradient" className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gold flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-gold-400 animate-pulse" />
              {t('dashboard.title')}
            </h1>
            <p className="text-gold-300 mt-1">{t('dashboard.subtitle')}</p>
          </div>
          <div className="text-gold-400/60 text-sm">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </Card>

      {/* Stats Grid with Enhanced Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          {...statsCards[0]} 
          variant="gradient" 
          color="blue" 
        />
        <StatCard 
          {...statsCards[1]} 
          variant="gradient" 
          color="green" 
        />
        <StatCard 
          {...statsCards[2]} 
          variant="gradient" 
          color="purple" 
        />
        <StatCard 
          {...statsCards[3]} 
          variant="gradient" 
          color="gold" 
        />
      </div>

      {/* Atividades Recentes com Visual Melhorado */}
      <Card 
        title={t('dashboard.recentActivities')}
        variant="elevated"
        action={
          recentActivities.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open('/dashboard/activities', '_blank')}
            >
              {t('dashboard.viewAll')}
            </Button>
          )
        }
      >
        <div className="space-y-4">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 pb-4 border-b border-gold-500/20 last:border-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-500/30 to-gold-600/20 flex items-center justify-center text-gold shadow-lg transition-transform hover:scale-110">
                  {activity.icon === 'user' && <UserPlus className="w-5 h-5" />}
                  {activity.icon === 'course' && <BookPlus className="w-5 h-5" />}
                  {activity.icon === 'enrollment' && <Activity className="w-5 h-5" />}
                  {activity.icon === 'award' && <Award className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="text-gold-200">
                    <span className="font-semibold text-gold">{activity.userName}</span> {activity.action}
                  </p>
                  {activity.entityName && (
                    <p className="text-gold-400 text-sm">{activity.entityName}</p>
                  )}
                  <p className="text-gold-500/60 text-xs mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {activity.timestamp}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gold-300">{t('dashboard.noRecentActivity')}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Cursos Populares */}
      <Card title={t('dashboard.popularCourses')} subtitle={t('dashboard.basedOnEnrollments')}>
        <div className="space-y-4">
          {popularCourses.length > 0 ? (
            popularCourses.map((course, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gold-200 font-medium">{course.name}</span>
                  <span className="text-gold-400 text-sm">{course.students} {t('dashboard.students')}</span>
                </div>
                <div className="w-full bg-navy-900/50 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-gold-500 to-gold-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${course.percentage}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gold-300">{t('dashboard.noCoursesYet')}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">{t('dashboard.instructors')}</p>
              <p className="text-2xl font-bold text-gold mt-1">{stats.totalInstructors}</p>
            </div>
            <Users className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">{t('dashboard.draftCourses')}</p>
              <p className="text-2xl font-bold text-gold mt-1">{stats.totalCourses - stats.publishedCourses}</p>
            </div>
            <FileText className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">{t('dashboard.ongoingEnrollments')}</p>
              <p className="text-2xl font-bold text-gold mt-1">{stats.totalEnrollments - stats.completedEnrollments}</p>
            </div>
            <Activity className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
      </div>
    </div>
  )
}
'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, BookOpen, GraduationCap, TrendingUp, Clock, Award, Activity, FileText, UserPlus, BookPlus, ArrowUpRight } from 'lucide-react'
import StatCard from '../components/StatCard'
import Card from '../components/Card'
import Button from '../components/Button'
import { useTranslation } from '../contexts/LanguageContext'
import { SkeletonStatCard } from '../components/Skeleton'
import { getAdminDashboardData } from '@/lib/actions/admin-dashboard'

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
  const router = useRouter()
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

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const result = await getAdminDashboardData()

      if (!result) {
        console.error('Error fetching dashboard data')
        return
      }

      // Check for authorization errors
      if ('unauthorized' in result && result.unauthorized) {
        router.push(result.redirectTo || '/')
        return
      }

      const fetchedStats = result.stats
      const fetchedPopularCourses = result.coursePopularity
      const fetchedActivities = result.activities

      // Transform activities to match component format
      const activities: RecentActivity[] = (fetchedActivities || []).map((activity: any) => {
        const date = new Date(activity.timestamp)
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

        let actionText = ''
        switch (activity.action) {
          case 'user_created':
            actionText = t('dashboard.userJoined')
            break
          case 'user_deleted':
            actionText = t('dashboard.userDeleted')
            break
          case 'user_permanently_deleted':
            actionText = t('dashboard.userPermanentlyDeleted')
            break
          case 'course_created':
            actionText = t('dashboard.createdCourse')
            break
          case 'course_published':
            actionText = t('dashboard.publishedCourse')
            break
          case 'enrolled_in_course':
            actionText = t('dashboard.enrolledInCourse')
            break
          case 'student_enrolled':
            actionText = t('dashboard.newStudentEnrolled')
            break
          case 'enroll_students':
            actionText = t('dashboard.enrolledStudents')
            break
          case 'completed_course':
            actionText = t('dashboard.completedCourse')
            break
          case 'lesson_completed':
            actionText = t('dashboard.lessonCompleted')
            break
          case 'certificate_requested':
            actionText = t('dashboard.certificateRequested')
            break
          case 'certificate_auto_requested':
            actionText = t('dashboard.certificateAutoRequested')
            break
          case 'certificate_approved':
            actionText = t('dashboard.certificateApproved')
            break
          case 'certificate_rejected':
            actionText = t('dashboard.certificateRejected')
            break
          default:
            actionText = activity.action
        }

        return {
          userId: activity.userId,
          userName: activity.userName,
          action: actionText,
          entityName: activity.entityName,
          timestamp: timeAgo,
          icon: activity.icon as 'user' | 'course' | 'enrollment' | 'award'
        }
      })

      setRecentActivities(activities)
      setPopularCourses(fetchedPopularCourses || [])
      if (fetchedStats) {
        setStats(fetchedStats)
      }
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
      <Card variant="default" className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold">
              {t('dashboard.title')}
            </h1>
            <p className="text-gold-300 mt-1">{t('dashboard.subtitle')}</p>
          </div>
          <div className="text-gold-400/60 text-sm">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          {...statsCards[0]}
          variant="default"
          color="blue"
        />
        <StatCard
          {...statsCards[1]}
          variant="default"
          color="green"
        />
        <StatCard
          {...statsCards[2]}
          variant="default"
          color="purple"
        />
        <StatCard
          {...statsCards[3]}
          variant="default"
          color="gold"
        />
      </div>

      {/* Atividades Recentes */}
      <Card
        title={t('dashboard.recentActivities')}
        variant="default"
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
            recentActivities.slice(0, 5).map((activity, index) => (
              <div key={index} className="flex items-start gap-3 pb-4 border-b border-gold-500/20 last:border-0">
                <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center text-gold">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
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
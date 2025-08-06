'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { BookOpen, Clock, Target, Award, TrendingUp, Calendar, CheckCircle, AlertCircle, Activity, BarChart3 } from 'lucide-react'
import StatCard from '../components/StatCard'
import Card from '../components/Card'
import Button from '../components/Button'
import ProgressChart from '../components/ProgressChart'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { useTranslation } from '../contexts/LanguageContext'
import { useRouter } from 'next/navigation'

type Course = Database['public']['Tables']['courses']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']
type LessonProgress = Database['public']['Tables']['lesson_progress']['Row']

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
  type: 'lesson_completed' | 'course_started' | 'achievement' | 'test_completed'
  description: string
  timestamp: string
  icon: 'lesson' | 'course' | 'achievement' | 'test'
}

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<StudentStats>({
    enrolledCourses: 0,
    completedCourses: 0,
    hoursLearned: 0,
    certificates: 0,
    currentStreak: 0,
    overallProgress: 0
  })
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const { t } = useTranslation()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUserAndFetchData()
  }, [])

  const checkUserAndFetchData = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/')
        return
      }

      // Check if user is a student
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'student') {
        router.push('/dashboard')
        return
      }

      setUser(user)
      await fetchStudentData(user.id)
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/')
    }
  }

  const fetchStudentData = async (userId: string) => {
    try {
      // Fetch enrollments with course details
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('user_id', userId)
        .order('enrolled_at', { ascending: false })

      // Fetch user progress statistics using the database function
      const { data: progressStats, error: statsError } = await supabase
        .rpc('get_user_progress_stats', { p_user_id: userId })
        .single()

      if (statsError) {
        console.error('Error fetching progress stats:', statsError)
      }

      // Fetch lesson progress for last accessed calculation
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', userId)
        .order('last_accessed_at', { ascending: false })

      // Process enrollments for display
      const enrolledCoursesData: EnrolledCourse[] = []

      if (enrollments) {
        for (const enrollment of enrollments) {
          if (enrollment.course) {
            // Find last accessed lesson for this enrollment
            const lastAccessedLesson = lessonProgress?.find(lp => lp.enrollment_id === enrollment.id)
            
            enrolledCoursesData.push({
              ...enrollment.course,
              enrollment: enrollment,
              progress: enrollment.progress_percentage || 0,
              lastAccessed: lastAccessedLesson?.last_accessed_at || enrollment.enrolled_at || undefined
            })
          }
        }
      }

      // Set statistics from database function or calculate fallback
      if (progressStats) {
        setStats({
          enrolledCourses: progressStats.total_enrolled_courses || 0,
          completedCourses: progressStats.completed_courses || 0,
          hoursLearned: Math.round(progressStats.hours_completed || 0),
          certificates: progressStats.completed_courses || 0,
          currentStreak: progressStats.current_streak || 0,
          overallProgress: progressStats.overall_progress || 0
        })
      } else {
        // Fallback calculation if function fails
        const totalProgress = enrolledCoursesData.reduce((sum, course) => sum + course.progress, 0)
        const overallProgress = enrolledCoursesData.length > 0 
          ? Math.round(totalProgress / enrolledCoursesData.length)
          : 0

        setStats({
          enrolledCourses: enrolledCoursesData.length,
          completedCourses: enrolledCoursesData.filter(c => c.enrollment.status === 'completed').length,
          hoursLearned: Math.round(enrolledCoursesData.reduce((sum, c) => sum + (c.duration_hours || 0) * (c.progress / 100), 0)),
          certificates: enrolledCoursesData.filter(c => c.enrollment.status === 'completed').length,
          currentStreak: calculateStreak(lessonProgress || []),
          overallProgress
        })
      }

      setEnrolledCourses(enrolledCoursesData)

      // Fetch recent activities
      const { data: activities } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (activities) {
        const formattedActivities: RecentActivity[] = activities.map(activity => ({
          id: activity.id,
          type: mapActivityType(activity.action),
          description: formatActivityDescription(activity, t),
          timestamp: formatTimeAgo(activity.created_at, t),
          icon: mapActivityIcon(activity.action)
        }))
        setRecentActivities(formattedActivities)
      }

    } catch (error) {
      console.error('Error fetching student data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStreak = (lessonProgress: LessonProgress[]): number => {
    // Simple streak calculation based on consecutive days with activity
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const activityDates = lessonProgress
      .map(lp => new Date(lp.last_accessed_at || lp.started_at || ''))
      .sort((a, b) => b.getTime() - a.getTime())

    let streak = 0
    let currentDate = new Date(today)

    for (let i = 0; i < 30; i++) { // Check last 30 days
      const hasActivity = activityDates.some(date => {
        const activityDate = new Date(date)
        activityDate.setHours(0, 0, 0, 0)
        return activityDate.getTime() === currentDate.getTime()
      })

      if (hasActivity) {
        streak++
        currentDate.setDate(currentDate.getDate() - 1)
      } else if (i === 0) {
        // No activity today, check if there was activity yesterday
        currentDate.setDate(currentDate.getDate() - 1)
        continue
      } else {
        break
      }
    }

    return streak
  }

  const mapActivityType = (action: string): RecentActivity['type'] => {
    switch (action) {
      case 'lesson_completed':
        return 'lesson_completed'
      case 'enrolled_in_course':
        return 'course_started'
      case 'completed_course':
        return 'achievement'
      case 'test_completed':
        return 'test_completed'
      default:
        return 'course_started'
    }
  }

  const mapActivityIcon = (action: string): RecentActivity['icon'] => {
    switch (action) {
      case 'lesson_completed':
        return 'lesson'
      case 'enrolled_in_course':
        return 'course'
      case 'completed_course':
        return 'achievement'
      case 'test_completed':
        return 'test'
      default:
        return 'course'
    }
  }

  const formatActivityDescription = (activity: any, t: any): string => {
    switch (activity.action) {
      case 'lesson_completed':
        return `Concluiu a aula "${activity.entity_name}"`
      case 'enrolled_in_course':
        return `Matriculou-se em "${activity.entity_name}"`
      case 'completed_course':
        return `Concluiu o curso "${activity.entity_name}"`
      case 'test_completed':
        return `Completou o teste em "${activity.entity_name}"`
      default:
        return activity.entity_name || activity.action
    }
  }

  const formatTimeAgo = (timestamp: string, t: any): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${t('dashboard.minutesAgo')}`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} ${t('dashboard.hoursAgo')}`
    } else {
      return `${Math.floor(diffInMinutes / 1440)} ${t('dashboard.daysAgo')}`
    }
  }

  const statsCards = [
    {
      title: 'Cursos Matriculados',
      value: stats.enrolledCourses.toString(),
      icon: <BookOpen className="w-6 h-6" />,
      trend: { value: 0, isPositive: true },
      subtitle: `${stats.completedCourses} concluídos`
    },
    {
      title: 'Horas de Estudo',
      value: stats.hoursLearned.toString(),
      icon: <Clock className="w-6 h-6" />,
      trend: { value: 0, isPositive: true },
      subtitle: 'Total acumulado'
    },
    {
      title: 'Progresso Geral',
      value: `${stats.overallProgress}%`,
      icon: <Target className="w-6 h-6" />,
      trend: { value: 0, isPositive: true },
      subtitle: 'Média dos cursos'
    },
    {
      title: 'Certificados',
      value: stats.certificates.toString(),
      icon: <Award className="w-6 h-6" />,
      trend: { value: 0, isPositive: true },
      subtitle: 'Conquistados'
    }
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gold">Meu Painel de Aprendizagem</h1>
        <p className="text-gold-300 mt-1">Acompanhe seu progresso e continue aprendendo</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gold mb-2">Progresso Geral</h3>
              <p className="text-sm text-gold-300">Média de todos os cursos</p>
            </div>
            <ProgressChart 
              progress={stats.overallProgress} 
              size={100}
              strokeWidth={6}
              labelSize="md"
            />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gold mb-2">Horas de Estudo</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gold">{stats.hoursLearned}</span>
                <span className="text-sm text-gold-300">/ {Math.round(enrolledCourses.reduce((sum, c) => sum + (c.duration_hours || 0), 0))}h</span>
              </div>
              <div className="mt-2 w-full bg-navy-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${enrolledCourses.length > 0 ? (stats.hoursLearned / enrolledCourses.reduce((sum, c) => sum + (c.duration_hours || 0), 0)) * 100 : 0}%` }}
                />
              </div>
            </div>
            <Clock className="w-10 h-10 text-blue-500/30" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gold mb-2">Taxa de Conclusão</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gold">{stats.completedCourses}</span>
                <span className="text-sm text-gold-300">/ {stats.enrolledCourses} cursos</span>
              </div>
              <p className="text-sm text-green-400 mt-2">
                {stats.enrolledCourses > 0 ? Math.round((stats.completedCourses / stats.enrolledCourses) * 100) : 0}% concluídos
              </p>
            </div>
            <Award className="w-10 h-10 text-green-500/30" />
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Meus Cursos - 2 columns */}
        <div className="lg:col-span-2">
          <Card 
            title="Meus Cursos"
            subtitle="Continue de onde parou"
            action={
              enrolledCourses.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push('/student-dashboard/my-courses')}
                >
                  Ver todos
                </Button>
              )
            }
          >
            <div className="space-y-4">
              {enrolledCourses.length > 0 ? (
                enrolledCourses.slice(0, 3).map((course) => (
                  <div 
                    key={course.id} 
                    className="bg-navy-900/50 rounded-xl p-4 hover:bg-navy-900/70 transition-all cursor-pointer group"
                    onClick={() => router.push('/student-dashboard/my-courses')}
                  >
                    <div className="flex items-start gap-4">
                      {/* Progress Circle */}
                      <div className="flex-shrink-0">
                        <ProgressChart 
                          progress={course.progress} 
                          size={80}
                          strokeWidth={6}
                          labelSize="sm"
                          color={course.enrollment.status === 'completed' ? 'green' : 'gold'}
                        />
                      </div>

                      {/* Course Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gold text-lg group-hover:text-gold-400 transition-colors">{course.title}</h3>
                            <p className="text-gold-300 text-sm mt-1">{course.category}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                            course.enrollment.status === 'completed' 
                              ? 'bg-green-500/20 text-green-400'
                              : course.progress >= 50
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {course.enrollment.status === 'completed' 
                              ? 'Concluído' 
                              : course.progress >= 50 
                              ? 'Em progresso' 
                              : 'Iniciado'}
                          </span>
                        </div>

                        {/* Progress Details */}
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-gold-500/50" />
                            <div>
                              <span className="text-gold-400 font-medium">
                                {Math.round((course.duration_hours || 0) * (course.progress / 100))}h
                              </span>
                              <span className="text-gold-500/60"> / {course.duration_hours}h</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Activity className="w-4 h-4 text-gold-500/50" />
                            <span className="text-gold-400">{formatTimeAgo(course.lastAccessed || '', t)}</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="w-full bg-navy-800 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                course.enrollment.status === 'completed'
                                  ? 'bg-gradient-to-r from-green-500 to-green-600'
                                  : 'bg-gradient-to-r from-gold-500 to-gold-600'
                              }`}
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <BookOpen className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
                    <p className="text-gold-300 text-lg mb-4">Você ainda não está matriculado em nenhum curso</p>
                    <Button onClick={() => router.push('/student-dashboard/courses')}>
                      Explorar cursos disponíveis
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Sequência de Estudo */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gold">Sequência de Estudo</h3>
              <div className="flex items-center gap-2 text-gold-400">
                <TrendingUp className="w-5 h-5" />
                <span className="font-bold">{stats.currentStreak}</span>
                <span className="text-sm">dias</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {[...Array(28)].map((_, i) => {
                const isActive = i >= 28 - stats.currentStreak
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded ${
                      isActive 
                        ? 'bg-gradient-to-br from-gold-500 to-gold-600' 
                        : 'bg-navy-800'
                    }`}
                  />
                )
              })}
            </div>
            <p className="text-sm text-gold-300 mt-3 text-center">
              Continue estudando para manter sua sequência!
            </p>
          </Card>

          {/* Atividades Recentes */}
          <Card title="Atividades Recentes">
            <div className="space-y-3">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center text-gold flex-shrink-0">
                      {activity.icon === 'lesson' && <CheckCircle className="w-4 h-4" />}
                      {activity.icon === 'course' && <BookOpen className="w-4 h-4" />}
                      {activity.icon === 'achievement' && <Award className="w-4 h-4" />}
                      {activity.icon === 'test' && <AlertCircle className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gold-200 text-sm">{activity.description}</p>
                      <p className="text-gold-500/60 text-xs mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gold-300 text-center py-4">Nenhuma atividade recente</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Próximas Aulas */}
      <Card 
        title="Próximas Aulas"
        subtitle="Aulas agendadas para esta semana"
        action={
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => router.push('/student-dashboard/calendar')}
            icon={<Calendar className="w-4 h-4" />}
          >
            Ver calendário
          </Button>
        }
      >
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gold-500/30 mx-auto mb-3" />
          <p className="text-gold-300">Nenhuma aula agendada para os próximos dias</p>
        </div>
      </Card>
    </div>
  )
}
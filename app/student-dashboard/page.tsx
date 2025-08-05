'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Clock, Target, Award, TrendingUp, Calendar, CheckCircle, AlertCircle } from 'lucide-react'
import StatCard from '../components/StatCard'
import Card from '../components/Card'
import Button from '../components/Button'
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

      // Fetch lesson progress
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', userId)

      // Calculate statistics
      const enrolledCoursesData: EnrolledCourse[] = []
      let totalHours = 0
      let completedCount = 0
      let totalProgress = 0

      if (enrollments) {
        for (const enrollment of enrollments) {
          if (enrollment.course) {
            // Calculate course progress based on lesson progress
            const courseProgress = enrollment.progress_percentage || 0
            
            enrolledCoursesData.push({
              ...enrollment.course,
              enrollment: enrollment,
              progress: courseProgress,
              lastAccessed: lessonProgress
                ?.filter(lp => lp.enrollment_id === enrollment.id)
                .sort((a, b) => new Date(b.last_accessed_at || 0).getTime() - new Date(a.last_accessed_at || 0).getTime())[0]
                ?.last_accessed_at || enrollment.enrolled_at || undefined
            })

            totalHours += enrollment.course.duration_hours || 0
            if (enrollment.status === 'completed') {
              completedCount++
            }
            totalProgress += courseProgress
          }
        }
      }

      // Calculate overall progress
      const overallProgress = enrolledCoursesData.length > 0 
        ? Math.round(totalProgress / enrolledCoursesData.length)
        : 0

      // Set statistics
      setStats({
        enrolledCourses: enrolledCoursesData.length,
        completedCourses: completedCount,
        hoursLearned: Math.round(totalHours * (overallProgress / 100)),
        certificates: completedCount,
        currentStreak: calculateStreak(lessonProgress || []),
        overallProgress
      })

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
                  <div key={course.id} className="bg-navy-900/50 rounded-xl p-4 hover:bg-navy-900/70 transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gold text-lg">{course.title}</h3>
                        <p className="text-gold-300 text-sm mt-1">{course.category}</p>
                      </div>
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        course.enrollment.status === 'completed' 
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {course.enrollment.status === 'completed' ? 'Concluído' : 'Em andamento'}
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gold-300">Progresso</span>
                        <span className="text-gold-400 font-medium">{course.progress}%</span>
                      </div>
                      <div className="w-full bg-navy-800 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-gold-500 to-gold-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 text-sm text-gold-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {course.duration_hours}h de conteúdo
                      </span>
                      <span>Último acesso: {formatTimeAgo(course.lastAccessed || '', t)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
                  <p className="text-gold-300 text-lg mb-4">Você ainda não está matriculado em nenhum curso</p>
                  <Button onClick={() => router.push('/student-dashboard/courses')}>
                    Explorar Cursos
                  </Button>
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
          <Button variant="secondary" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
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
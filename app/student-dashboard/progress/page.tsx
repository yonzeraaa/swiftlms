'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { BookOpen, Clock, Target, Award, TrendingUp, Calendar, CheckCircle, Activity, BarChart3, ArrowUp, ArrowDown } from 'lucide-react'
import Card from '../../components/Card'
import ProgressChart from '../../components/ProgressChart'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { useTranslation } from '../../contexts/LanguageContext'
import { useRouter } from 'next/navigation'

type Course = Database['public']['Tables']['courses']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']
type LessonProgress = Database['public']['Tables']['lesson_progress']['Row']

interface CourseProgress {
  course: Course
  enrollment: Enrollment
  totalLessons: number
  completedLessons: number
  progress: number
  hoursCompleted: number
  lastActivity?: string
}

interface WeeklyProgress {
  day: string
  lessons: number
  hours: number
}

export default function ProgressPage() {
  const [loading, setLoading] = useState(true)
  const [coursesProgress, setCoursesProgress] = useState<CourseProgress[]>([])
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress[]>([])
  const [totalStats, setTotalStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    totalLessons: 0,
    completedLessons: 0,
    totalHours: 0,
    completedHours: 0,
    averageProgress: 0,
    currentStreak: 0
  })
  const { t } = useTranslation()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchProgressData()
  }, [])

  const fetchProgressData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      // Fetch user progress stats
      const { data: progressStats } = await supabase
        .rpc('get_user_progress_stats', { p_user_id: user.id })
        .single()

      if (progressStats) {
        setTotalStats({
          totalCourses: progressStats.total_enrolled_courses || 0,
          completedCourses: progressStats.completed_courses || 0,
          totalLessons: progressStats.total_lessons || 0,
          completedLessons: progressStats.completed_lessons || 0,
          totalHours: Math.round(progressStats.total_hours_content || 0),
          completedHours: Math.round(progressStats.hours_completed || 0),
          averageProgress: progressStats.overall_progress || 0,
          currentStreak: progressStats.current_streak || 0
        })
      }

      // Fetch detailed course progress
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('user_id', user.id)
        .order('enrolled_at', { ascending: false })

      if (enrollments) {
        const progressData: CourseProgress[] = []

        for (const enrollment of enrollments) {
          if (enrollment.course) {
            // Count lessons for this course
            const { data: modules } = await supabase
              .from('course_modules')
              .select('id')
              .eq('course_id', enrollment.course_id)

            const moduleIds = modules?.map((m: any) => m.id) || []
            
            const { data: lessons } = await supabase
              .from('lessons')
              .select('id')
              .in('module_id', moduleIds)

            const { data: completedLessons } = await supabase
              .from('lesson_progress')
              .select('lesson_id')
              .eq('enrollment_id', enrollment.id)
              .eq('is_completed', true)

            const totalLessons = lessons?.length || 0
            const completed = completedLessons?.length || 0

            progressData.push({
              course: enrollment.course,
              enrollment,
              totalLessons,
              completedLessons: completed,
              progress: enrollment.progress_percentage || 0,
              hoursCompleted: Math.round((enrollment.course.duration_hours || 0) * (enrollment.progress_percentage || 0) / 100),
              lastActivity: enrollment.enrolled_at || undefined
            })
          }
        }

        setCoursesProgress(progressData)
      }

      // Fetch weekly progress
      const { data: weeklyData } = await supabase
        .from('lesson_progress')
        .select('completed_at')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .gte('completed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      if (weeklyData) {
        const progressByDay: { [key: string]: number } = {}
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
        
        // Initialize all days with 0
        days.forEach((day: any) => {
          progressByDay[day] = 0
        })

        // Count lessons per day
        weeklyData.forEach((lesson: any) => {
          if (lesson.completed_at) {
            const date = new Date(lesson.completed_at)
            const dayName = days[date.getDay()]
            progressByDay[dayName]++
          }
        })

        const weekProgress: WeeklyProgress[] = days.map((day: any) => ({
          day,
          lessons: progressByDay[day],
          hours: Math.round(progressByDay[day] * 0.5) // Assuming 30 min per lesson average
        }))

        setWeeklyProgress(weekProgress)
      }

    } catch (error) {
      console.error('Error fetching progress data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-400'
    if (progress >= 50) return 'text-blue-400'
    if (progress >= 20) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getProgressBgColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500/20'
    if (progress >= 50) return 'bg-blue-500/20'
    if (progress >= 20) return 'bg-yellow-500/20'
    return 'bg-red-500/20'
  }

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
        <h1 className="text-3xl font-bold text-gold">Meu Progresso</h1>
        <p className="text-gold-300 mt-1">Acompanhe seu desempenho e evolução nos cursos</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Progresso Geral</p>
              <p className="text-3xl font-bold text-gold">{totalStats.averageProgress}%</p>
            </div>
            <div className="relative">
              <ProgressChart progress={totalStats.averageProgress} size={80} strokeWidth={6} showLabel={false} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Lições Completadas</p>
              <p className="text-3xl font-bold text-gold">{totalStats.completedLessons}</p>
              <p className="text-sm text-gold-400">de {totalStats.totalLessons} total</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500/30" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Horas Estudadas</p>
              <p className="text-3xl font-bold text-gold">{totalStats.completedHours}h</p>
              <p className="text-sm text-gold-400">de {totalStats.totalHours}h total</p>
            </div>
            <Clock className="w-10 h-10 text-blue-500/30" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Sequência Atual</p>
              <p className="text-3xl font-bold text-gold">{totalStats.currentStreak}</p>
              <p className="text-sm text-gold-400">dias consecutivos</p>
            </div>
            <TrendingUp className="w-10 h-10 text-gold-500/30" />
          </div>
        </Card>
      </div>

      {/* Weekly Progress */}
      <Card title="Progresso Semanal" subtitle="Atividade nos últimos 7 dias">
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {weeklyProgress.map((day, index) => (
              <div key={index} className="text-center">
                <p className="text-xs text-gold-400 mb-2">{day.day}</p>
                <div className="relative">
                  <div className="w-full bg-navy-800 rounded-lg h-24 flex items-end">
                    <div 
                      className="w-full bg-gradient-to-t from-gold-500 to-gold-400 rounded-lg transition-all duration-500"
                      style={{ height: `${Math.min(day.lessons * 20, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gold-300 mt-1">{day.lessons}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 text-sm text-gold-400">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gold-500 rounded" />
              Lições completadas
            </span>
          </div>
        </div>
      </Card>

      {/* Course Progress Details */}
      <Card title="Progresso por Curso" subtitle="Detalhamento do seu avanço em cada curso">
        <div className="space-y-4">
          {coursesProgress.length > 0 ? (
            coursesProgress.map((courseProgress) => (
              <div key={courseProgress.enrollment.id} className="bg-navy-900/50 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gold">{courseProgress.course.title}</h3>
                    <p className="text-gold-300 text-sm mt-1">{courseProgress.course.category}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${getProgressBgColor(courseProgress.progress)} ${getProgressColor(courseProgress.progress)}`}>
                    {courseProgress.progress}%
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-gold-500/50" />
                    <div>
                      <p className="text-sm text-gold-400">Lições</p>
                      <p className="text-gold-200">
                        {courseProgress.completedLessons} / {courseProgress.totalLessons}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-gold-500/50" />
                    <div>
                      <p className="text-sm text-gold-400">Tempo</p>
                      <p className="text-gold-200">
                        {courseProgress.hoursCompleted}h / {courseProgress.course.duration_hours}h
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-gold-500/50" />
                    <div>
                      <p className="text-sm text-gold-400">Status</p>
                      <p className="text-gold-200">
                        {courseProgress.enrollment.status === 'completed' ? 'Concluído' : 'Em andamento'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gold-300">Progresso do Curso</span>
                    <span className={`font-medium ${getProgressColor(courseProgress.progress)}`}>
                      {courseProgress.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-navy-800 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-1000 ${
                        courseProgress.progress >= 80 
                          ? 'bg-gradient-to-r from-green-500 to-green-600'
                          : courseProgress.progress >= 50
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                          : courseProgress.progress >= 20
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                          : 'bg-gradient-to-r from-red-500 to-red-600'
                      }`}
                      style={{ width: `${courseProgress.progress}%` }}
                    />
                  </div>
                </div>

                {/* Performance Indicator */}
                {courseProgress.progress > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    {courseProgress.progress >= 80 ? (
                      <>
                        <ArrowUp className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Excelente progresso! Continue assim!</span>
                      </>
                    ) : courseProgress.progress >= 50 ? (
                      <>
                        <ArrowUp className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-400">Bom ritmo! Mais da metade concluída.</span>
                      </>
                    ) : (
                      <>
                        <Activity className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400">Continue estudando para avançar!</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
              <p className="text-gold-300 text-lg">Você ainda não está matriculado em nenhum curso</p>
              <p className="text-gold-400 text-sm mt-2">Explore nossos cursos para começar sua jornada de aprendizado</p>
            </div>
          )}
        </div>
      </Card>

      {/* Achievement Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Conquistas Recentes">
          <div className="space-y-3">
            {totalStats.completedCourses > 0 && (
              <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
                <Award className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-green-400 font-medium">{totalStats.completedCourses} Cursos Concluídos</p>
                  <p className="text-sm text-green-400/70">Parabéns pela dedicação!</p>
                </div>
              </div>
            )}
            {totalStats.currentStreak >= 7 && (
              <div className="flex items-center gap-3 p-3 bg-gold-500/10 rounded-lg">
                <TrendingUp className="w-8 h-8 text-gold-400" />
                <div>
                  <p className="text-gold-400 font-medium">Sequência de {totalStats.currentStreak} dias</p>
                  <p className="text-sm text-gold-400/70">Consistência é a chave!</p>
                </div>
              </div>
            )}
            {totalStats.completedLessons >= 50 && (
              <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg">
                <Target className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-blue-400 font-medium">{totalStats.completedLessons} Lições Completadas</p>
                  <p className="text-sm text-blue-400/70">Excelente progresso!</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card title="Metas de Estudo">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gold-300 text-sm">Meta diária: 2 lições</span>
                <span className="text-gold-400 text-sm font-medium">
                  {weeklyProgress.find(d => d.day === new Date().toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3))?.lessons || 0}/2
                </span>
              </div>
              <div className="w-full bg-navy-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-gold-500 to-gold-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(((weeklyProgress.find(d => d.day === new Date().toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3))?.lessons || 0) / 2) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gold-300 text-sm">Meta semanal: 10 lições</span>
                <span className="text-gold-400 text-sm font-medium">
                  {weeklyProgress.reduce((sum, day) => sum + day.lessons, 0)}/10
                </span>
              </div>
              <div className="w-full bg-navy-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((weeklyProgress.reduce((sum, day) => sum + day.lessons, 0) / 10) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
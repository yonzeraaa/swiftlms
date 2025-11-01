'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { BookOpen, Clock, Target, Award, TrendingUp, Calendar, CheckCircle, Activity, BarChart3, ArrowUp, ArrowDown, ChevronRight, ChevronDown, Loader2 as ProgressIcon } from 'lucide-react'
import Card from '../../components/Card'
import Spinner from '../../components/ui/Spinner'
import Breadcrumbs from '../../components/ui/Breadcrumbs'
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
  modules: {
    id: string
    title: string
    totalLessons: number
    completedLessons: number
    progress: number
  }[]
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
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())
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
            // Get modules for this course
            const { data: modules } = await supabase
              .from('course_modules')
              .select('*')
              .eq('course_id', enrollment.course_id)
              .order('order_index')

            // Fetch allowed modules for this enrollment
            let allowedModuleIds: string[] | null = null
            const { data: enrollmentModules, error: enrollmentModulesError } = await supabase
              .from('enrollment_modules')
              .select('module_id')
              .eq('enrollment_id', enrollment.id)

            if (enrollmentModulesError) {
              console.error('Erro ao carregar módulos da matrícula:', enrollmentModulesError)
            } else if (enrollmentModules) {
              allowedModuleIds = enrollmentModules
                .map((moduleEntry: { module_id: string | null }) => moduleEntry.module_id)
                .filter((moduleId: string | null): moduleId is string => typeof moduleId === 'string')
            }

            const moduleProgress = []
            let totalCourseLessons = 0
            let totalCompletedLessons = 0

            const filteredModules = modules && allowedModuleIds !== null
              ? (modules as any[]).filter((module: any) => allowedModuleIds?.includes(module.id))
              : modules || []

            if (filteredModules.length > 0) {
              for (const module of filteredModules) {
                // Get lessons for this module
                const { data: lessons } = await supabase
                  .from('lessons')
                  .select('id')
                  .eq('module_id', module.id)

                const moduleLessonIds = lessons?.map((l: any) => l.id) || []

                // Get completed lessons for this module
                const { data: completedLessons } = await supabase
                  .from('lesson_progress')
                  .select('lesson_id')
                  .eq('enrollment_id', enrollment.id)
                  .eq('is_completed', true)
                  .in('lesson_id', moduleLessonIds)

                const moduleTotalLessons = lessons?.length || 0
                const moduleCompletedLessons = completedLessons?.length || 0

                totalCourseLessons += moduleTotalLessons
                totalCompletedLessons += moduleCompletedLessons

                moduleProgress.push({
                  id: module.id,
                  title: module.title,
                  totalLessons: moduleTotalLessons,
                  completedLessons: moduleCompletedLessons,
                  progress: moduleTotalLessons > 0
                    ? Math.round((moduleCompletedLessons / moduleTotalLessons) * 100)
                    : 0
                })
              }
            }

            const courseProgressPercentage = totalCourseLessons > 0
              ? Math.round((totalCompletedLessons / totalCourseLessons) * 100)
              : 0

            progressData.push({
              course: enrollment.course,
              enrollment,
              totalLessons: totalCourseLessons,
              completedLessons: totalCompletedLessons,
              progress: courseProgressPercentage,
              hoursCompleted: Math.round((enrollment.course.duration_hours || 0) * courseProgressPercentage / 100),
              lastActivity: enrollment.enrolled_at || undefined,
              modules: moduleProgress
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
        weeklyData.forEach((progress: any) => {
          if (progress.completed_at) {
            const date = new Date(progress.completed_at)
            const dayName = days[date.getDay()]
            progressByDay[dayName]++
          }
        })

        const weekProgress = days.map(day => ({
          day,
          lessons: progressByDay[day],
          hours: Math.round(progressByDay[day] * 0.5) // Estimate 30 minutes per lesson
        }))

        setWeeklyProgress(weekProgress)
      }
    } catch (error) {
      console.error('Error fetching progress data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleCourseExpansion = (courseId: string) => {
    setExpandedCourses(prev => {
      const newSet = new Set(prev)
      if (newSet.has(courseId)) {
        newSet.delete(courseId)
      } else {
        newSet.add(courseId)
      }
      return newSet
    })
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-400 bg-green-500'
    if (progress >= 50) return 'text-yellow-400 bg-yellow-500'
    if (progress >= 20) return 'text-orange-400 bg-orange-500'
    return 'text-red-400 bg-red-500'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs className="mb-2" />

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-gold-400" />
          Meu Progresso
        </h1>
        <p className="text-gold-300 mt-1">Acompanhe seu desempenho e evolução nos cursos</p>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-gold-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Cursos Ativos</p>
              <p className="text-2xl font-bold text-gold">{totalStats.totalCourses}</p>
              <p className="text-xs text-gold-400 mt-1">
                {totalStats.completedCourses} concluídos
              </p>
            </div>
            <BookOpen className="w-8 h-8 text-gold-400" />
          </div>
        </Card>

        <Card className="p-4 border-blue-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Progresso Geral</p>
              <p className="text-2xl font-bold text-blue-400">{totalStats.averageProgress}%</p>
              <div className="w-full bg-navy-800/50 rounded-full h-2 mt-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all"
                  style={{ width: `${totalStats.averageProgress}%` }}
                />
              </div>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-4 border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Aulas Concluídas</p>
              <p className="text-2xl font-bold text-green-400">{totalStats.completedLessons}</p>
              <p className="text-xs text-gold-400 mt-1">
                de {totalStats.totalLessons} totais
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-4 border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Horas de Estudo</p>
              <p className="text-2xl font-bold text-purple-400">{totalStats.completedHours}h</p>
              <p className="text-xs text-gold-400 mt-1">
                de {totalStats.totalHours}h totais
              </p>
            </div>
            <Clock className="w-8 h-8 text-purple-400" />
          </div>
        </Card>
      </div>

      {/* Atividade Semanal */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-gold-400" />
          Atividade Semanal
        </h2>
        <div className="grid grid-cols-7 gap-2">
          {weeklyProgress.map(({ day, lessons }) => (
            <div key={day} className="text-center">
              <p className="text-xs text-gold-400 mb-2">{day}</p>
              <div className="relative">
                <div className="w-full h-24 bg-navy-800/50 rounded-lg flex items-end">
                  <div
                    className="w-full bg-gradient-to-t from-gold-500 to-gold-400 rounded-lg transition-all"
                    style={{ height: `${Math.min(lessons * 20, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-gold-200 mt-1">{lessons}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Progresso Detalhado por Curso */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gold flex items-center gap-2">
          <ProgressIcon className="w-5 h-5 text-gold-400" />
          Progresso por Curso
        </h2>

        {coursesProgress.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gold-400">Você ainda não está matriculado em nenhum curso.</p>
          </Card>
        ) : (
          coursesProgress.map(courseProgress => {
            const isExpanded = expandedCourses.has(courseProgress.course.id)
            const progressColor = getProgressColor(courseProgress.progress)

            return (
              <Card key={courseProgress.course.id} className="overflow-hidden !text-left">
                {/* Header do Curso */}
                <button
                  onClick={() => toggleCourseExpansion(courseProgress.course.id)}
                  className="w-full block text-left hover:bg-navy-800/30 transition-all"
                  style={{ textAlign: 'left' }}
                >
                  <div className="p-4 text-left">
                    {/* Linha superior com chevron e título */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="mt-1 flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gold-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gold-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gold text-left break-words" style={{ textAlign: 'left' }}>
                          {courseProgress.course.title}
                        </h3>
                        <p className="text-sm text-gold-300 mt-1 text-left" style={{ textAlign: 'left' }}>
                          {courseProgress.completedLessons} de {courseProgress.totalLessons} aulas concluídas
                        </p>
                      </div>
                      {courseProgress.progress === 100 && (
                        <Award className="w-6 h-6 text-gold-400 flex-shrink-0" />
                      )}
                    </div>

                    {/* Barra de Progresso */}
                    <div className="ml-8 pr-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${progressColor.split(' ')[0]}`}>
                          {courseProgress.progress}%
                        </span>
                        <span className="text-xs text-gold-400">
                          {courseProgress.hoursCompleted}h / {courseProgress.course.duration_hours}h
                        </span>
                      </div>
                      <div className="w-full bg-navy-800/50 rounded-full h-3">
                        <div
                          className={`${progressColor.split(' ')[1]} h-3 rounded-full transition-all`}
                          style={{ width: `${courseProgress.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </button>

                {/* Detalhes dos Módulos - Expandível */}
                {isExpanded && courseProgress.modules.length > 0 && (
                  <div className="border-t border-gold-500/20 p-4 bg-navy-800/20">
                    <h4 className="text-sm font-medium text-gold-300 mb-3">Progresso por Módulo</h4>
                    <div className="space-y-3">
                      {courseProgress.modules.map(module => (
                        <div key={module.id} className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm text-gold-200">{module.title}</p>
                            <p className="text-xs text-gold-400">
                              {module.completedLessons}/{module.totalLessons} aulas
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-32">
                              <div className="w-full bg-navy-900/50 rounded-full h-2">
                                <div
                                  className={`${getProgressColor(module.progress).split(' ')[1]} h-2 rounded-full transition-all`}
                                  style={{ width: `${module.progress}%` }}
                                />
                              </div>
                            </div>
                            <span className={`text-sm font-medium ${getProgressColor(module.progress).split(' ')[0]} min-w-[3rem] text-right`}>
                              {module.progress}%
                            </span>
                            {module.progress === 100 && (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Estatísticas do Curso */}
                    <div className="mt-4 pt-4 border-t border-gold-500/10 grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-xs text-gold-400">Taxa de Conclusão</p>
                        <p className="text-lg font-semibold text-gold">{courseProgress.progress}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gold-400">Tempo Investido</p>
                        <p className="text-lg font-semibold text-gold">{courseProgress.hoursCompleted}h</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gold-400">Status</p>
                        <p className="text-lg font-semibold text-gold">
                          {courseProgress.progress === 100 ? (
                            <span className="text-green-400">Concluído</span>
                          ) : courseProgress.progress > 0 ? (
                            <span className="text-yellow-400">Em Progresso</span>
                          ) : (
                            <span className="text-gray-400">Não Iniciado</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Gráfico de Progresso */}
      {coursesProgress.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gold mb-4">Visão Geral do Progresso</h2>
          <div className="space-y-4">
            {coursesProgress.map(cp => (
              <div key={cp.course.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gold-300">{cp.course.title}</span>
                  <span className="text-gold-100 font-semibold">{cp.progress}%</span>
                </div>
                <div className="w-full bg-navy-800 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-gold-500 to-gold-400 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${cp.progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gold-400">
                  <span>{cp.completedLessons} de {cp.totalLessons} aulas</span>
                  <span>{cp.hoursCompleted.toFixed(1)}h estudadas</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Clock, Target, Award, TrendingUp, Calendar, CheckCircle, Activity, BarChart3, ChevronRight, ChevronDown } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import { ClassicRule } from '../../components/ui/RenaissanceSvgs'
import { Database } from '@/lib/database.types'
import { useRouter } from 'next/navigation'
import { getStudentProgress } from '@/lib/actions/browse-enroll'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

type Course = Database['public']['Tables']['courses']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']

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
  const router = useRouter()

  useEffect(() => {
    fetchProgressData()
  }, [])

  const fetchProgressData = async () => {
    try {
      const data = await getStudentProgress()

      if (!data) {
        router.push('/')
        return
      }

      const { enrollments, enrollmentModules, modules, lessons, progress, stats, weeklyProgress: weeklyData } = data

      if (stats && typeof stats === 'object' && 'total_enrolled_courses' in stats) {
        setTotalStats({
          totalCourses: (stats as any).total_enrolled_courses || 0,
          completedCourses: (stats as any).completed_courses || 0,
          totalLessons: (stats as any).total_lessons || 0,
          completedLessons: (stats as any).completed_lessons || 0,
          totalHours: Math.round((stats as any).total_hours_content || 0),
          completedHours: Math.round((stats as any).hours_completed || 0),
          averageProgress: (stats as any).overall_progress || 0,
          currentStreak: (stats as any).current_streak || 0
        })
      }

      const progressData: CourseProgress[] = []

      for (const enrollment of enrollments) {
        if (enrollment.courses) {
          const allowedModuleIds = enrollmentModules
            .filter((em: any) => em.enrollment_id === enrollment.id)
            .map((em: any) => em.module_id)
            .filter(Boolean)

          const courseModules = modules.filter((m: any) =>
            m.course_id === enrollment.course_id &&
            (allowedModuleIds.length === 0 || allowedModuleIds.includes(m.id))
          )

          const moduleProgress = []
          let totalCourseLessons = 0
          let totalCompletedLessons = 0

          for (const module of courseModules) {
            const moduleLessons = lessons.filter((l: any) => l.module_id === module.id)
            const moduleLessonIds = moduleLessons.map((l: any) => l.id)

            const completedLessons = progress.filter((p: any) =>
              p.enrollment_id === enrollment.id &&
              p.is_completed &&
              moduleLessonIds.includes(p.lesson_id)
            )

            const moduleTotalLessons = moduleLessons.length
            const moduleCompletedLessons = completedLessons.length

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

          const courseProgressPercentage = totalCourseLessons > 0
            ? Math.round((totalCompletedLessons / totalCourseLessons) * 100)
            : 0

          progressData.push({
            course: enrollment.courses,
            enrollment,
            totalLessons: totalCourseLessons,
            completedLessons: totalCompletedLessons,
            progress: courseProgressPercentage,
            hoursCompleted: Math.round((enrollment.courses.duration_hours || 0) * courseProgressPercentage / 100),
            lastActivity: enrollment.enrolled_at || undefined,
            modules: moduleProgress
          })
        }
      }

      setCoursesProgress(progressData)

      if (weeklyData) {
        const progressByDay: { [key: string]: number } = {}
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

        days.forEach((day: any) => {
          progressByDay[day] = 0
        })

        weeklyData.forEach((progressItem: any) => {
          if (progressItem.completed_at) {
            const date = new Date(progressItem.completed_at)
            const dayName = days[date.getDay()]
            progressByDay[dayName]++
          }
        })

        const weekProgress = days.map(day => ({
          day,
          lessons: progressByDay[day],
          hours: Math.round(progressByDay[day] * 0.5)
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
    if (progress >= 80) return { text: INK, bg: `${INK}/10` }
    if (progress >= 50) return { text: '#b8860b', bg: 'rgba(184,134,11,0.1)' }
    if (progress >= 20) return { text: '#8b4513', bg: 'rgba(139,69,19,0.1)' }
    return { text: MUTED, bg: `${MUTED}/10` }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full">

      {/* ── Cabeçalho ── */}
      <div className="text-center flex flex-col items-center mb-12">
        <h1
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 700,
            color: INK,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            marginBottom: '0.5rem'
          }}
        >
          Meu Progresso
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-lora)',
            fontSize: '1.1rem',
            fontStyle: 'italic',
            color: MUTED,
            marginBottom: '2rem'
          }}
        >
          Acompanhe seu desempenho e evolução nos cursos
        </p>
        <ClassicRule style={{ width: '100%', maxWidth: '300px', color: INK }} />
      </div>

      {/* ── Estatísticas Gerais ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-10 mb-14 px-4">
        {[
          { label: 'Cursos Ativos', value: totalStats.totalCourses, sub: `${totalStats.completedCourses} concluídos` },
          { label: 'Progresso Geral', value: `${totalStats.averageProgress}%`, sub: 'média de conclusão' },
          { label: 'Aulas Concluídas', value: totalStats.completedLessons, sub: `de ${totalStats.totalLessons} totais` },
          { label: 'Horas de Estudo', value: `${totalStats.completedHours}h`, sub: `de ${totalStats.totalHours}h totais` },
        ].map((stat, idx) => (
          <div key={idx} className="flex flex-col items-center text-center relative">
            <span
              style={{
                fontFamily: 'var(--font-lora)',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: MUTED,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                marginBottom: '1rem'
              }}
            >
              {stat.label}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: '3rem',
                fontWeight: 700,
                color: INK,
                lineHeight: 1,
                marginBottom: '0.75rem'
              }}
            >
              {stat.value}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-lora)',
                fontSize: '0.85rem',
                fontStyle: 'italic',
                color: ACCENT,
              }}
            >
              {stat.sub}
            </span>

            {idx !== 3 && (
              <div className="hidden md:block absolute right-[-2rem] top-[15%] bottom-[15%] w-px opacity-20" style={{ backgroundColor: INK }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Atividade Semanal ── */}
      <div className="mb-14">
        <div className="flex items-center gap-3 mb-6">
          <Activity size={20} style={{ color: ACCENT }} />
          <h2
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '1.5rem',
              fontWeight: 600,
              color: INK,
            }}
          >
            Atividade Semanal
          </h2>
        </div>
        <ClassicRule style={{ marginBottom: '1.5rem', color: BORDER }} />

        <div className="grid grid-cols-7 gap-3">
          {weeklyProgress.map(({ day, lessons }) => (
            <div key={day} className="text-center">
              <p
                style={{
                  fontFamily: 'var(--font-lora)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: MUTED,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '0.75rem'
                }}
              >
                {day}
              </p>
              <div className="relative h-24 rounded-lg overflow-hidden" style={{ backgroundColor: `${INK}/5` }}>
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-lg transition-all duration-500"
                  style={{
                    height: `${Math.min(lessons * 25, 100)}%`,
                    backgroundColor: ACCENT,
                    opacity: 0.8
                  }}
                />
              </div>
              <p
                style={{
                  fontFamily: 'var(--font-lora)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: INK,
                  marginTop: '0.5rem'
                }}
              >
                {lessons}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Progresso Detalhado por Curso ── */}
      <div className="mb-14">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 size={20} style={{ color: ACCENT }} />
          <h2
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '1.5rem',
              fontWeight: 600,
              color: INK,
            }}
          >
            Progresso por Curso
          </h2>
        </div>
        <ClassicRule style={{ marginBottom: '1.5rem', color: BORDER }} />

        {coursesProgress.length === 0 ? (
          <div
            className="text-center py-12 rounded-lg"
            style={{ backgroundColor: `${INK}/3`, border: `1px solid ${BORDER}` }}
          >
            <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1rem', color: MUTED, fontStyle: 'italic' }}>
              Você ainda não está matriculado em nenhum curso.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {coursesProgress.map(courseProgress => {
              const isExpanded = expandedCourses.has(courseProgress.course.id)
              const colors = getProgressColor(courseProgress.progress)

              return (
                <div
                  key={courseProgress.course.id}
                  className="rounded-lg overflow-hidden"
                  style={{ backgroundColor: PARCH, border: `1px solid ${BORDER}`, boxShadow: '0 2px 8px rgba(30,19,12,0.06)' }}
                >
                  {/* Header do Curso */}
                  <button
                    onClick={() => toggleCourseExpansion(courseProgress.course.id)}
                    className="w-full text-left p-5 transition-all hover:bg-black/5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1 flex-shrink-0" style={{ color: ACCENT }}>
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h3
                            style={{
                              fontFamily: 'var(--font-playfair)',
                              fontSize: '1.2rem',
                              fontWeight: 600,
                              color: INK,
                              lineHeight: 1.2,
                            }}
                          >
                            {courseProgress.course.title}
                          </h3>
                          {courseProgress.progress === 100 && (
                            <Award size={22} style={{ color: ACCENT }} className="flex-shrink-0" />
                          )}
                        </div>
                        <p
                          style={{
                            fontFamily: 'var(--font-lora)',
                            fontSize: '0.9rem',
                            color: MUTED,
                            marginBottom: '1rem'
                          }}
                        >
                          {courseProgress.completedLessons} de {courseProgress.totalLessons} aulas concluídas
                        </p>

                        {/* Barra de Progresso */}
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: `${INK}/10` }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${courseProgress.progress}%`,
                                backgroundColor: ACCENT
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontFamily: 'var(--font-playfair)',
                              fontSize: '1.1rem',
                              fontWeight: 700,
                              color: colors.text,
                              minWidth: '3.5rem',
                              textAlign: 'right'
                            }}
                          >
                            {courseProgress.progress}%
                          </span>
                        </div>
                        <p
                          style={{
                            fontFamily: 'var(--font-lora)',
                            fontSize: '0.8rem',
                            color: MUTED,
                            marginTop: '0.5rem'
                          }}
                        >
                          {courseProgress.hoursCompleted}h estudadas de {courseProgress.course.duration_hours}h
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Detalhes dos Módulos - Expandível */}
                  {isExpanded && courseProgress.modules.length > 0 && (
                    <div className="border-t p-5" style={{ borderColor: BORDER, backgroundColor: `${INK}/3` }}>
                      <h4
                        style={{
                          fontFamily: 'var(--font-lora)',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: MUTED,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: '1rem'
                        }}
                      >
                        Progresso por Módulo
                      </h4>
                      <div className="space-y-3">
                        {courseProgress.modules.map(module => {
                          const modColors = getProgressColor(module.progress)
                          return (
                            <div key={module.id} className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <p
                                  style={{
                                    fontFamily: 'var(--font-lora)',
                                    fontSize: '0.95rem',
                                    color: INK,
                                  }}
                                >
                                  {module.title}
                                </p>
                                <p
                                  style={{
                                    fontFamily: 'var(--font-lora)',
                                    fontSize: '0.8rem',
                                    color: MUTED,
                                  }}
                                >
                                  {module.completedLessons}/{module.totalLessons} aulas
                                </p>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="w-28 h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${INK}/10` }}>
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${module.progress}%`,
                                      backgroundColor: ACCENT
                                    }}
                                  />
                                </div>
                                <span
                                  style={{
                                    fontFamily: 'var(--font-playfair)',
                                    fontSize: '0.95rem',
                                    fontWeight: 600,
                                    color: modColors.text,
                                    minWidth: '2.5rem',
                                    textAlign: 'right'
                                  }}
                                >
                                  {module.progress}%
                                </span>
                                {module.progress === 100 && (
                                  <CheckCircle size={16} style={{ color: ACCENT }} />
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Estatísticas do Curso */}
                      <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4" style={{ borderColor: BORDER }}>
                        <div className="text-center">
                          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.7rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Taxa de Conclusão</p>
                          <p style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.3rem', fontWeight: 700, color: INK }}>{courseProgress.progress}%</p>
                        </div>
                        <div className="text-center">
                          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.7rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tempo Investido</p>
                          <p style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.3rem', fontWeight: 700, color: INK }}>{courseProgress.hoursCompleted}h</p>
                        </div>
                        <div className="text-center">
                          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.7rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</p>
                          <p style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', fontWeight: 600, color: courseProgress.progress === 100 ? ACCENT : MUTED }}>
                            {courseProgress.progress === 100 ? 'Concluído' : courseProgress.progress > 0 ? 'Em Progresso' : 'Não Iniciado'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Visão Geral do Progresso ── */}
      {coursesProgress.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp size={20} style={{ color: ACCENT }} />
            <h2
              style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: '1.5rem',
                fontWeight: 600,
                color: INK,
              }}
            >
              Visão Geral do Progresso
            </h2>
          </div>
          <ClassicRule style={{ marginBottom: '1.5rem', color: BORDER }} />

          <div
            className="space-y-6 p-6 rounded-lg"
            style={{ backgroundColor: PARCH, border: `1px solid ${BORDER}` }}
          >
            {coursesProgress.map(cp => (
              <div key={cp.course.id}>
                <div className="flex justify-between mb-2">
                  <span
                    style={{
                      fontFamily: 'var(--font-lora)',
                      fontSize: '0.95rem',
                      color: INK,
                    }}
                  >
                    {cp.course.title}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-playfair)',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: INK,
                    }}
                  >
                    {cp.progress}%
                  </span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: `${INK}/10` }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${cp.progress}%`,
                      backgroundColor: ACCENT
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.8rem', color: MUTED }}>
                    {cp.completedLessons} de {cp.totalLessons} aulas
                  </span>
                  <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.8rem', color: MUTED }}>
                    {cp.hoursCompleted}h estudadas
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

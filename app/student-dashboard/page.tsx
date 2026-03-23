'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Clock, Target, Award, TrendingUp, Calendar, CheckCircle, Activity, BookPlus } from 'lucide-react'
import { Database } from '@/lib/database.types'
import { useTranslation } from '../contexts/LanguageContext'
import { useRouter } from 'next/navigation'
import { getStudentDashboardData } from '@/lib/actions/browse-enroll'
import { ClassicRule } from '../components/ui/RenaissanceSvgs'
import Spinner from '../components/ui/Spinner'

type Course = Database['public']['Tables']['courses']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']
type LessonProgress = Database['public']['Tables']['lesson_progress']['Row']

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

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
  type: 'lesson_completed' | 'course_started' | 'achievement'
  description: string
  timestamp: string
  icon: 'lesson' | 'course' | 'achievement'
}

function SkeletonBlock({ height = 20, width = '100%', style }: { height?: number; width?: string | number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        height,
        width,
        backgroundColor: 'rgba(30,19,12,0.06)',
        borderRadius: 0,
        animation: 'pulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  )
}

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    fetchStudentData()
  }, [])

  const fetchStudentData = async () => {
    try {
      const data = await getStudentDashboardData()

      if (!data) {
        router.push('/')
        return
      }

      const { enrollments, stats: progressStats, recentProgress: lessonProgress, activities } = data

      const enrolledCoursesData: EnrolledCourse[] = []

      if (enrollments) {
        for (const enrollment of enrollments) {
          if (enrollment.course) {
            const lastAccessedLesson = lessonProgress?.find((lp: any) => lp.enrollment_id === enrollment.id)

            enrolledCoursesData.push({
              ...enrollment.course,
              enrollment: enrollment,
              progress: enrollment.progress_percentage || 0,
              lastAccessed: lastAccessedLesson?.last_accessed_at || enrollment.enrolled_at || undefined
            })
          }
        }
      }

      if (progressStats && typeof progressStats === 'object' && 'total_enrolled_courses' in progressStats) {
        setStats({
          enrolledCourses: (progressStats as any).total_enrolled_courses || 0,
          completedCourses: (progressStats as any).completed_courses || 0,
          hoursLearned: Math.round((progressStats as any).hours_completed || 0),
          certificates: (progressStats as any).total_certificates || 0,
          currentStreak: (progressStats as any).current_streak || 0,
          overallProgress: (progressStats as any).overall_progress || 0
        })
      } else {
        const totalProgress = enrolledCoursesData.reduce((sum, course) => sum + course.progress, 0)
        const overallProgress = enrolledCoursesData.length > 0
          ? Math.round(totalProgress / enrolledCoursesData.length)
          : 0

        setStats({
          enrolledCourses: enrolledCoursesData.length,
          completedCourses: enrolledCoursesData.filter((c: any) => c.enrollment.status === 'completed').length,
          hoursLearned: Math.round(enrolledCoursesData.reduce((sum, c) => sum + (c.duration_hours || 0) * (c.progress / 100), 0)),
          certificates: enrolledCoursesData.filter((c: any) => c.enrollment.status === 'completed').length,
          currentStreak: 0,
          overallProgress
        })
      }

      setEnrolledCourses(enrolledCoursesData)

      if (activities) {
        const formattedActivities: RecentActivity[] = activities.map((activity: any) => ({
          id: activity.id,
          type: mapActivityType(activity.action),
          description: formatActivityDescription(activity),
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

  const mapActivityType = (action: string): RecentActivity['type'] => {
    switch (action) {
      case 'lesson_completed': return 'lesson_completed'
      case 'enrolled_in_course': return 'course_started'
      case 'completed_course': return 'achievement'
      default: return 'course_started'
    }
  }

  const mapActivityIcon = (action: string): RecentActivity['icon'] => {
    switch (action) {
      case 'lesson_completed': return 'lesson'
      case 'enrolled_in_course': return 'course'
      case 'completed_course': return 'achievement'
      default: return 'course'
    }
  }

  const formatActivityDescription = (activity: any): string => {
    switch (activity.action) {
      case 'lesson_completed': return `Concluiu a aula "${activity.entity_name}"`
      case 'enrolled_in_course': return `Matriculou-se em "${activity.entity_name}"`
      case 'completed_course': return `Concluiu o curso "${activity.entity_name}"`
      default: return activity.entity_name || activity.action
    }
  }

  const formatTimeAgo = (timestamp: string, t: any): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) return `${diffInMinutes} ${t('dashboard.minutesAgo')}`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ${t('dashboard.hoursAgo')}`
    return `${Math.floor(diffInMinutes / 1440)} ${t('dashboard.daysAgo')}`
  }

  if (loading) {
    return <Spinner fullPage size="xl" />
  }

  return (
    <div className="flex flex-col">
      
      {/* ── Cabeçalho do Painel ── */}
      <div className="text-center flex flex-col items-center mb-12">
        <h1
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 700,
            color: INK,
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            marginBottom: '0.5rem'
          }}
        >
          Meu Painel de Aprendizagem
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
          Acompanhe seu progresso e continue sua jornada de conhecimento
        </p>
        <p
          style={{
            fontFamily: 'var(--font-lora)',
            fontSize: '0.9rem',
            color: INK,
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}
        >
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        
        <ClassicRule style={{ width: '100%', maxWidth: '300px', marginTop: '2.5rem', color: INK }} />
      </div>

      {/* ── Métricas de Aluno ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-12 mb-16">
        {[
          { label: 'Cursos Matriculados', value: stats.enrolledCourses, sub: `${stats.completedCourses} concluídos` },
          { label: 'Horas de Estudo', value: stats.hoursLearned, sub: 'Total acumulado' },
          { label: 'Progresso Geral', value: `${stats.overallProgress}%`, sub: 'Média dos cursos' },
          { label: 'Certificados', value: stats.certificates, sub: 'Conquistados' },
        ].map((stat, idx) => (
          <div key={idx} className="flex flex-col items-center text-center relative">
            <span
              style={{
                fontFamily: 'var(--font-lora)',
                fontSize: '0.75rem',
                fontWeight: 600,
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
                fontWeight: 600,
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
              <div className="hidden md:block absolute right-[-2rem] top-[20%] bottom-[20%] w-px" style={{ backgroundColor: BORDER }} />
            )}
          </div>
        ))}
      </div>

      <ClassicRule style={{ width: '100%', marginBottom: '3rem', color: INK, opacity: 0.5 }} />

      {/* ── Seção Inferior: Cursos e Atividades ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        
        {/* Meus Cursos Recentes */}
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '1.75rem',
              fontWeight: 600,
              color: INK,
              marginBottom: '0.5rem',
              textAlign: 'center'
            }}
          >
            Estudos Recentes
          </h2>
          <div className="flex justify-center mb-6">
            <div className="w-16 h-px" style={{ backgroundColor: ACCENT }} />
          </div>

          {enrolledCourses.length > 0 ? (
            <div className="space-y-8">
              {enrolledCourses.slice(0, 3).map((course, idx) => (
                <div 
                  key={idx} 
                  className="group cursor-pointer"
                  onClick={() => router.push(`/student-dashboard/course/${course.id}`)}
                >
                  <div className="flex justify-between items-baseline mb-2">
                    <span style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', color: INK, fontWeight: 600 }}>
                      {course.title}
                    </span>
                    <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.85rem', color: MUTED, fontStyle: 'italic' }}>
                      {course.progress}% concluído
                    </span>
                  </div>
                  
                  <div className="relative w-full h-[3px]" style={{ backgroundColor: 'transparent', borderTop: `1px dashed ${BORDER}` }}>
                    <div
                      className="absolute top-[-1px] left-0 h-[3px]"
                      style={{
                        width: `${course.progress}%`,
                        backgroundColor: ACCENT,
                        transition: 'width 1s ease',
                      }}
                    />
                  </div>
                  
                  <div className="flex justify-between mt-2">
                    <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.8rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {course.category}
                    </p>
                    <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.8rem', color: ACCENT, fontStyle: 'italic' }}>
                      Acessado {formatTimeAgo(course.lastAccessed || '', t)}
                    </p>
                  </div>
                </div>
              ))}
              
              <div className="pt-4 text-center">
                <button
                  onClick={() => router.push('/student-dashboard/my-courses')}
                  className="inline-block pb-1 transition-opacity hover:opacity-70"
                  style={{
                    fontFamily: 'var(--font-lora)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: INK,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    borderBottom: `1px solid ${INK}`,
                    background: 'none',
                    border: 'none',
                    borderBottomStyle: 'solid',
                    cursor: 'pointer'
                  }}
                >
                  Ver Todos os Meus Cursos
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p style={{ fontFamily: 'var(--font-lora)', fontStyle: 'italic', color: MUTED, marginBottom: '2rem' }}>
                Você ainda não iniciou sua jornada em nenhum curso.
              </p>
              <button
                onClick={() => router.push('/student-dashboard/courses')}
                style={{
                  fontFamily: 'var(--font-lora)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: PARCH,
                  backgroundColor: INK,
                  padding: '0.75rem 2rem',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}
              >
                Explorar Catálogo
              </button>
            </div>
          )}
        </div>

        {/* Atividades do Aluno */}
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '1.75rem',
              fontWeight: 600,
              color: INK,
              marginBottom: '0.5rem',
              textAlign: 'center'
            }}
          >
            Registros de Atividade
          </h2>
          <div className="flex justify-center mb-6">
            <div className="w-16 h-px" style={{ backgroundColor: ACCENT }} />
          </div>

          {recentActivities.length > 0 ? (
            <div className="space-y-0">
              {recentActivities.slice(0, 6).map((activity, idx) => (
                <div 
                  key={idx} 
                  className="py-4"
                  style={{ borderBottom: idx < 5 ? `1px dashed ${BORDER}` : 'none' }}
                >
                  <p 
                    style={{ 
                      fontFamily: 'var(--font-lora)', 
                      fontSize: '0.95rem', 
                      color: INK,
                      lineHeight: 1.5
                    }}
                  >
                    {activity.description}
                  </p>
                  <div className="flex justify-end mt-1">
                    <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.8rem', color: MUTED, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {activity.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontFamily: 'var(--font-lora)', fontStyle: 'italic', color: MUTED, textAlign: 'center', padding: '3rem 0' }}>
              Nenhum registro de atividade recente.
            </p>
          )}
        </div>
      </div>
      
      {/* Sequência de Estudo Estilo Clássico */}
      <div className="mt-20 p-8 border border-[#1e130c]/10 bg-[#1e130c]/[0.02] text-center">
        <h3 
          style={{ 
            fontFamily: 'var(--font-playfair)', 
            fontSize: '1.25rem', 
            color: INK,
            marginBottom: '1rem' 
          }}
        >
          Sequência de Estudo
        </h3>
        <div className="flex justify-center gap-2 mb-4 flex-wrap">
          {[...Array(14)].map((_, i) => {
            const active = i < stats.currentStreak
            return (
              <div
                key={i}
                style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  border: `1px solid ${active ? ACCENT : BORDER}`,
                  backgroundColor: active ? ACCENT : 'transparent',
                  opacity: active ? 1 : 0.3
                }}
              />
            )
          })}
        </div>
        <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.9rem', color: MUTED, fontStyle: 'italic' }}>
          {stats.currentStreak > 0 
            ? `Você mantém uma sequência de ${stats.currentStreak} dias de dedicação!`
            : 'Comece sua sequência de estudos hoje mesmo!'}
        </p>
      </div>

    </div>
  )
}

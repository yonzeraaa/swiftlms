'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  BarChart3, 
  Clock, 
  CheckCircle2,
  Target,
  Calendar,
  TrendingUp
} from 'lucide-react'
import Card from '../../../../components/Card'
import Button from '../../../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import ProgressRing from '../../../../components/ui/ProgressRing'
import Breadcrumbs from '../../../../components/ui/Breadcrumbs'
import HeatMap from '../../../../components/ui/HeatMap'
import Spinner from '../../../../components/ui/Spinner'
import { DashboardBento } from '../../../../components/ui/BentoGrid'

type Course = Database['public']['Tables']['courses']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']

interface ProgressData {
  totalLessons: number
  completedLessons: number
  timeSpent: number
  weeklyActivity: Array<{ date: string; value: number }>
  recentActivity: Array<{
    date: string
    lesson: string
    type: 'completed' | 'started'
  }>
  milestones: Array<{
    title: string
    completed: boolean
    completedAt?: string
  }>
}

export default function CourseProgressPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  const supabase = createClient()

  const [course, setCourse] = useState<Course | null>(null)
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (courseId) {
      fetchProgressData()
    }
  }, [courseId])

  const fetchProgressData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      // Fetch course and enrollment
      const [courseResult, enrollmentResult] = await Promise.all([
        supabase.from('courses').select('*').eq('id', courseId).single(),
        supabase.from('enrollments').select('*').eq('course_id', courseId).eq('user_id', user.id).single()
      ])

      if (courseResult.error || !courseResult.data) {
        router.push('/student-dashboard/my-courses')
        return
      }

      if (enrollmentResult.error || !enrollmentResult.data) {
        router.push('/student-dashboard/courses')
        return
      }

      setCourse(courseResult.data)
      setEnrollment(enrollmentResult.data)

      // Fetch detailed progress data
      const { data: modules } = await supabase
        .from('course_modules')
        .select(`
          *,
          lessons(*)
        `)
        .eq('course_id', courseId)

      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('enrollment_id', enrollmentResult.data.id)

      // Calculate progress statistics
      let totalLessons = 0
      let completedLessons = 0
      const recentActivity: ProgressData['recentActivity'] = []

      if (modules) {
        modules.forEach((module: any) => {
          const lessons = (module as any).lessons || []
          totalLessons += lessons.length

          lessons.forEach((lesson: any) => {
            const progress = lessonProgress?.find((lp: any) => lp.lesson_id === lesson.id)
            if (progress?.is_completed) {
              completedLessons++
              if (progress.completed_at) {
                recentActivity.push({
                  date: progress.completed_at,
                  lesson: lesson.title,
                  type: 'completed'
                })
              }
            } else if (progress?.started_at) {
              recentActivity.push({
                date: progress.started_at,
                lesson: lesson.title,
                type: 'started'
              })
            }
          })
        })
      }

      // Sort recent activity by date
      recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      // Generate real weekly activity data from lesson progress
      const weeklyActivity = generateWeeklyActivity(lessonProgress || [])

      // Calculate real time spent from lesson progress
      let actualTimeSpent = 0
      if (lessonProgress && lessonProgress.length > 0) {
        // Estimate based on completed lessons and duration
        lessonProgress.forEach((lp: any) => {
          if (lp.is_completed && lp.completed_at && lp.started_at) {
            const startTime = new Date(lp.started_at).getTime()
            const endTime = new Date(lp.completed_at).getTime()
            const lessonTime = Math.round((endTime - startTime) / (1000 * 60)) // minutes
            actualTimeSpent += lessonTime
          }
        })
        
        // If no specific durations found, estimate 20 minutes per completed lesson
        if (actualTimeSpent === 0) {
          actualTimeSpent = completedLessons * 20
        }
      }

      // Generate milestones
      const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) : 0
      const milestones = [
        { 
          title: 'Primeira aula concluída', 
          completed: completedLessons >= 1,
          completedAt: completedLessons >= 1 ? recentActivity.find(a => a.type === 'completed')?.date : undefined
        },
        { 
          title: '25% do curso concluído', 
          completed: progressPercentage >= 0.25,
          completedAt: progressPercentage >= 0.25 ? recentActivity[Math.floor(recentActivity.length * 0.75)]?.date : undefined
        },
        { 
          title: '50% do curso concluído', 
          completed: progressPercentage >= 0.5,
          completedAt: progressPercentage >= 0.5 ? recentActivity[Math.floor(recentActivity.length * 0.5)]?.date : undefined
        },
        { 
          title: '75% do curso concluído', 
          completed: progressPercentage >= 0.75,
          completedAt: progressPercentage >= 0.75 ? recentActivity[Math.floor(recentActivity.length * 0.25)]?.date : undefined
        },
        { 
          title: 'Curso concluído', 
          completed: progressPercentage === 1,
          completedAt: progressPercentage === 1 ? recentActivity[0]?.date : undefined
        }
      ]

      setProgressData({
        totalLessons,
        completedLessons,
        timeSpent: actualTimeSpent,
        weeklyActivity,
        recentActivity: recentActivity.slice(0, 10),
        milestones
      })

    } catch (error) {
      console.error('Error fetching progress data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateWeeklyActivity = (lessonProgressData: any[]) => {
    const activity = []
    const today = new Date()
    
    // Create a map of dates with activity counts
    const activityByDate = new Map<string, number>()
    
    // Count activities per date from lesson progress
    lessonProgressData.forEach(lp => {
      if (lp.started_at) {
        const date = new Date(lp.started_at).toISOString().split('T')[0]
        activityByDate.set(date, (activityByDate.get(date) || 0) + 1)
      }
      if (lp.completed_at && lp.completed_at !== lp.started_at) {
        const date = new Date(lp.completed_at).toISOString().split('T')[0]
        activityByDate.set(date, (activityByDate.get(date) || 0) + 1)
      }
      if (lp.last_accessed_at && lp.last_accessed_at !== lp.started_at && lp.last_accessed_at !== lp.completed_at) {
        const date = new Date(lp.last_accessed_at).toISOString().split('T')[0]
        activityByDate.set(date, (activityByDate.get(date) || 0) + 1)
      }
    })
    
    // Generate activity data for last 31 days
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      activity.push({
        date: dateStr,
        value: activityByDate.get(dateStr) || 0
      })
    }
    
    return activity
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="xl" />
      </div>
    )
  }

  if (!course || !progressData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <BarChart3 className="w-16 h-16 text-gold-500/30 mb-4" />
        <h2 className="text-xl font-semibold text-gold-200 mb-2">Progresso não encontrado</h2>
        <Button onClick={() => router.push('/student-dashboard/my-courses')}>
          Voltar aos Meus Cursos
        </Button>
      </div>
    )
  }

  const progressPercentage = progressData.totalLessons > 0 
    ? Math.round((progressData.completedLessons / progressData.totalLessons) * 100) 
    : 0

  const statsCards = [
    <div key="progress" className="flex items-center justify-between">
      <div>
        <p className="text-gold-300 text-sm">Progresso Geral</p>
        <p className="text-2xl font-bold text-gold mt-1">{progressPercentage}%</p>
      </div>
      <ProgressRing 
        value={progressData.completedLessons} 
        max={progressData.totalLessons}
        size={60}
        showValue={false}
      />
    </div>,
    
    <div key="lessons" className="flex items-center justify-between">
      <div>
        <p className="text-gold-300 text-sm">Aulas Concluídas</p>
        <p className="text-2xl font-bold text-gold mt-1">
          {progressData.completedLessons}/{progressData.totalLessons}
        </p>
      </div>
      <CheckCircle2 className="w-8 h-8 text-green-500/30" />
    </div>,

    <div key="time" className="flex items-center justify-between">
      <div>
        <p className="text-gold-300 text-sm">Tempo Investido</p>
        <p className="text-2xl font-bold text-gold mt-1">{Math.floor(progressData.timeSpent / 60)}h {progressData.timeSpent % 60}m</p>
      </div>
      <Clock className="w-8 h-8 text-blue-500/30" />
    </div>,

    <div key="achievements" className="flex items-center justify-between">
      <div>
        <p className="text-gold-300 text-sm">Conquistas</p>
        <p className="text-2xl font-bold text-gold mt-1">
          {progressData.milestones.filter(m => m.completed).length}/{progressData.milestones.length}
        </p>
      </div>
      <Target className="w-8 h-8 text-gold-500/30" />
    </div>
  ]

  const chartContent = (
    <div className="h-full">
      <h3 className="text-xl font-semibold text-gold mb-4">Atividade Semanal</h3>
      <HeatMap 
        data={progressData.weeklyActivity}
        showLegend={true}
        cellSize={12}
        className="flex justify-center"
      />
    </div>
  )

  const activityContent = (
    <div className="h-full">
      <h3 className="text-lg font-semibold text-gold mb-4">Atividade Recente</h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {progressData.recentActivity.map((activity, index) => (
          <div key={index} className="flex items-center gap-3 p-3 bg-navy-800/30 rounded-lg">
            <div className={`w-3 h-3 rounded-full ${
              activity.type === 'completed' ? 'bg-green-400' : 'bg-blue-400'
            }`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-gold-200">{activity.lesson}</p>
              <p className="text-xs text-gold-300/70">
                {activity.type === 'completed' ? 'Concluída' : 'Iniciada'} em{' '}
                {new Date(activity.date).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        ))}
        {progressData.recentActivity.length === 0 && (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gold-500/30 mx-auto mb-2" />
            <p className="text-gold-300/70">Nenhuma atividade recente</p>
          </div>
        )}
      </div>
    </div>
  )

  const quickActionsContent = (
    <div className="h-full">
      <h3 className="text-lg font-semibold text-gold mb-4">Conquistas</h3>
      <div className="space-y-3">
        {progressData.milestones.map((milestone, index) => (
          <div key={index} className={`flex items-center gap-3 p-3 rounded-lg ${
            milestone.completed ? 'bg-green-500/20' : 'bg-navy-800/30'
          }`}>
            <CheckCircle2 className={`w-5 h-5 ${
              milestone.completed ? 'text-green-400' : 'text-gold-300/30'
            }`} />
            <span className={`text-sm ${
              milestone.completed ? 'text-green-300' : 'text-gold-300/70'
            }`}>
              {milestone.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <Breadcrumbs className="mb-2" />
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => router.push(`/student-dashboard/course/${courseId}`)}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Voltar ao Curso
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gold">Progresso do Curso</h1>
          <p className="text-gold-300 mt-1">{course.title}</p>
        </div>
      </div>

      {/* Progress Dashboard */}
      <DashboardBento
        stats={statsCards}
        chart={chartContent}
        activity={activityContent}
        quickActions={quickActionsContent}
      />

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button 
          variant="primary"
          onClick={() => router.push(`/student-dashboard/course/${courseId}`)}
          icon={<TrendingUp className="w-4 h-4" />}
        >
          Continuar Estudando
        </Button>
        <Button 
          variant="secondary"
          onClick={() => router.push('/student-dashboard/my-courses')}
        >
          Ver Todos os Cursos
        </Button>
      </div>
    </div>
  )
}

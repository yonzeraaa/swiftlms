'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Clock, Users, Award, Play, Search, Filter, TrendingUp } from 'lucide-react'
import Card from '../../components/Card'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { useRouter } from 'next/navigation'

type Course = Database['public']['Tables']['courses']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']
type CourseModule = Database['public']['Tables']['course_modules']['Row']
type Lesson = Database['public']['Tables']['lessons']['Row']

interface EnrolledCourse extends Course {
  enrollment: Enrollment
  modules?: CourseModule[]
  totalLessons: number
  completedLessons: number
  nextLesson?: Lesson
}

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<EnrolledCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchMyCourses()
  }, [])

  const fetchMyCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      // Fetch enrollments with course details
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('user_id', user.id)
        .order('enrolled_at', { ascending: false })

      if (enrollments) {
        const coursesWithDetails: EnrolledCourse[] = []

        for (const enrollment of enrollments) {
          if (enrollment.course) {
            // Fetch modules and lessons for each course
            const { data: modules } = await supabase
              .from('course_modules')
              .select(`
                *,
                lessons(*)
              `)
              .eq('course_id', enrollment.course.id)
              .order('order_index')

            // Fetch lesson progress
            const { data: lessonProgress } = await supabase
              .from('lesson_progress')
              .select('*')
              .eq('enrollment_id', enrollment.id)

            // Calculate total and completed lessons
            let totalLessons = 0
            let completedLessons = 0
            let nextLesson: Lesson | undefined

            if (modules) {
              modules.forEach(module => {
                const lessons = (module as any).lessons || []
                totalLessons += lessons.length
                
                lessons.forEach((lesson: Lesson) => {
                  const progress = lessonProgress?.find(lp => lp.lesson_id === lesson.id)
                  if (progress?.is_completed) {
                    completedLessons++
                  } else if (!nextLesson) {
                    nextLesson = lesson
                  }
                })
              })
            }

            coursesWithDetails.push({
              ...enrollment.course,
              enrollment: enrollment,
              modules: modules || [],
              totalLessons,
              completedLessons,
              nextLesson
            })
          }
        }

        setCourses(coursesWithDetails)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.category.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' ||
                         (filterStatus === 'active' && course.enrollment.status === 'active') ||
                         (filterStatus === 'completed' && course.enrollment.status === 'completed')
    
    return matchesSearch && matchesFilter
  })

  const stats = {
    total: courses.length,
    active: courses.filter(c => c.enrollment.status === 'active').length,
    completed: courses.filter(c => c.enrollment.status === 'completed').length,
    totalHours: courses.reduce((acc, c) => acc + (c.duration_hours || 0), 0)
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
        <h1 className="text-3xl font-bold text-gold">Meus Cursos</h1>
        <p className="text-gold-300 mt-1">Gerencie e acompanhe seu progresso nos cursos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Total de Cursos</p>
              <p className="text-2xl font-bold text-gold mt-1">{stats.total}</p>
            </div>
            <BookOpen className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Em Andamento</p>
              <p className="text-2xl font-bold text-gold mt-1">{stats.active}</p>
            </div>
            <Play className="w-8 h-8 text-blue-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Concluídos</p>
              <p className="text-2xl font-bold text-gold mt-1">{stats.completed}</p>
            </div>
            <Award className="w-8 h-8 text-green-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Horas Totais</p>
              <p className="text-2xl font-bold text-gold mt-1">{stats.totalHours}</p>
            </div>
            <Clock className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
          <input
            type="text"
            placeholder="Buscar cursos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'all' ? 'primary' : 'secondary'}
            onClick={() => setFilterStatus('all')}
            size="sm"
          >
            Todos
          </Button>
          <Button
            variant={filterStatus === 'active' ? 'primary' : 'secondary'}
            onClick={() => setFilterStatus('active')}
            size="sm"
          >
            Em Andamento
          </Button>
          <Button
            variant={filterStatus === 'completed' ? 'primary' : 'secondary'}
            onClick={() => setFilterStatus('completed')}
            size="sm"
          >
            Concluídos
          </Button>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCourses.length > 0 ? (
          filteredCourses.map((course) => (
            <Card key={course.id} className="hover:shadow-xl transition-shadow">
              <div className="space-y-4">
                {/* Course Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gold mb-1">{course.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gold-300">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {course.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {course.duration_hours}h
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {course.difficulty === 'beginner' ? 'Iniciante' : 
                         course.difficulty === 'intermediate' ? 'Intermediário' : 'Avançado'}
                      </span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    course.enrollment.status === 'completed' 
                      ? 'bg-green-500/20 text-green-400'
                      : course.enrollment.status === 'paused'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {course.enrollment.status === 'completed' ? 'Concluído' : 
                     course.enrollment.status === 'paused' ? 'Pausado' : 'Em Andamento'}
                  </span>
                </div>

                {/* Course Description */}
                {course.summary && (
                  <p className="text-gold-300 text-sm line-clamp-2">{course.summary}</p>
                )}

                {/* Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gold-300">Progresso do Curso</span>
                    <span className="text-sm font-medium text-gold">
                      {course.completedLessons}/{course.totalLessons} aulas
                    </span>
                  </div>
                  <div className="w-full bg-navy-800 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-gold-500 to-gold-600 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${course.totalLessons > 0 
                          ? (course.completedLessons / course.totalLessons) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-gold-400 mt-1">
                    {course.enrollment.progress_percentage || 0}% concluído
                  </p>
                </div>

                {/* Next Lesson */}
                {course.nextLesson && course.enrollment.status === 'active' && (
                  <div className="bg-navy-800/50 rounded-lg p-3">
                    <p className="text-sm text-gold-300 mb-1">Próxima aula:</p>
                    <p className="text-gold font-medium">{course.nextLesson.title}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  {course.enrollment.status === 'active' ? (
                    <>
                      <Button 
                        className="flex-1"
                        onClick={() => router.push(`/student-dashboard/course/${course.id}`)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Continuar
                      </Button>
                      <Button 
                        variant="secondary"
                        onClick={() => router.push(`/student-dashboard/course/${course.id}/progress`)}
                      >
                        <TrendingUp className="w-4 h-4" />
                      </Button>
                    </>
                  ) : course.enrollment.status === 'completed' ? (
                    <>
                      <Button 
                        className="flex-1"
                        variant="secondary"
                        onClick={() => router.push(`/student-dashboard/course/${course.id}`)}
                      >
                        Revisar Conteúdo
                      </Button>
                      <Button 
                        variant="primary"
                        onClick={() => router.push(`/student-dashboard/certificates/${course.id}`)}
                      >
                        <Award className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button 
                      className="flex-1"
                      onClick={() => router.push(`/student-dashboard/course/${course.id}`)}
                    >
                      Retomar Curso
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-2 text-center py-12">
            <BookOpen className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
            <p className="text-gold-300 text-lg mb-4">
              {searchTerm || filterStatus !== 'all' 
                ? 'Nenhum curso encontrado com os filtros aplicados'
                : 'Você ainda não está matriculado em nenhum curso'}
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <Button onClick={() => router.push('/student-dashboard/courses')}>
                Explorar Cursos Disponíveis
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
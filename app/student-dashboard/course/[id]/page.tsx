'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  BookOpen, 
  Clock, 
  Play, 
  CheckCircle2, 
  Lock, 
  ArrowLeft,
  FileText,
  Video,
  Award,
  Users,
  BarChart3,
  FileImage,
  Link
} from 'lucide-react'
import Card from '../../../components/Card'
import Button from '../../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import ProgressRing from '../../../components/ui/ProgressRing'
import { motion } from 'framer-motion'
import VideoPlayer from '../../components/VideoPlayer'
import DocumentViewer from '../../components/DocumentViewer'

type Course = Database['public']['Tables']['courses']['Row']
type CourseModule = Database['public']['Tables']['course_modules']['Row']
type Lesson = Database['public']['Tables']['lessons']['Row']
type LessonProgress = Database['public']['Tables']['lesson_progress']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']

interface ModuleWithLessons extends CourseModule {
  lessons: (Lesson & { progress?: LessonProgress })[]
}

interface CourseWithDetails extends Course {
  modules: ModuleWithLessons[]
  enrollment?: Enrollment
  instructor?: {
    name: string
    avatar?: string
  }
}

export default function CoursePage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  const supabase = createClient()

  const [course, setCourse] = useState<CourseWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [totalLessons, setTotalLessons] = useState(0)
  const [completedLessons, setCompletedLessons] = useState(0)

  useEffect(() => {
    if (courseId) {
      fetchCourseData()
    }
  }, [courseId])

  const fetchCourseData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single()

      if (courseError || !courseData) {
        console.error('Error fetching course:', courseError)
        router.push('/student-dashboard/my-courses')
        return
      }

      // Fetch enrollment
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .single()

      if (!enrollmentData) {
        router.push('/student-dashboard/courses')
        return
      }

      // Fetch modules with lessons
      const { data: modulesData } = await supabase
        .from('course_modules')
        .select(`
          *,
          lessons(*)
        `)
        .eq('course_id', courseId)
        .order('order_index')

      // Fetch lesson progress
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('enrollment_id', enrollmentData.id)

      // Process modules and lessons with progress
      const modulesWithProgress: ModuleWithLessons[] = []
      let totalLessonCount = 0
      let completedLessonCount = 0
      let firstIncompleteLesson: Lesson | null = null

      if (modulesData) {
        for (const module of modulesData) {
          const lessons = (module as any).lessons || []
          const lessonsWithProgress = lessons.map((lesson: Lesson) => {
            const progress = progressData?.find(p => p.lesson_id === lesson.id)
            if (progress?.is_completed) {
              completedLessonCount++
            } else if (!firstIncompleteLesson) {
              firstIncompleteLesson = lesson
            }
            totalLessonCount++
            return { ...lesson, progress }
          })

          modulesWithProgress.push({
            ...module,
            lessons: lessonsWithProgress
          })
        }
      }

      // Fetch instructor info (if exists)
      let instructorInfo = undefined
      if (courseData.instructor_id) {
        const { data: instructorData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', courseData.instructor_id)
          .single()

        if (instructorData) {
          instructorInfo = {
            name: instructorData.full_name || 'Instrutor',
            avatar: instructorData.avatar_url || undefined
          }
        }
      }

      setCourse({
        ...courseData,
        modules: modulesWithProgress,
        enrollment: enrollmentData,
        instructor: instructorInfo
      })

      setTotalLessons(totalLessonCount)
      setCompletedLessons(completedLessonCount)
      
      // Set the first incomplete lesson as selected
      if (firstIncompleteLesson) {
        setSelectedLesson(firstIncompleteLesson)
      } else if (modulesWithProgress.length > 0 && modulesWithProgress[0].lessons.length > 0) {
        setSelectedLesson(modulesWithProgress[0].lessons[0])
      }

    } catch (error) {
      console.error('Error fetching course data:', error)
      router.push('/student-dashboard/my-courses')
    } finally {
      setLoading(false)
    }
  }

  const handleLessonSelect = (lesson: Lesson) => {
    setSelectedLesson(lesson)
  }

  const markLessonComplete = async (lessonId: string) => {
    if (!course?.enrollment) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          enrollment_id: course.enrollment.id,
          lesson_id: lessonId,
          user_id: user.id,
          is_completed: true,
          completed_at: new Date().toISOString()
        })

      if (!error) {
        // Auto-advance to next lesson
        const currentModuleIndex = course.modules.findIndex(m => 
          m.lessons.some(l => l.id === lessonId)
        )
        const currentModule = course.modules[currentModuleIndex]
        const currentLessonIndex = currentModule.lessons.findIndex(l => l.id === lessonId)
        
        let nextLesson = null
        
        // Try next lesson in same module
        if (currentLessonIndex < currentModule.lessons.length - 1) {
          nextLesson = currentModule.lessons[currentLessonIndex + 1]
        } 
        // Try first lesson of next module
        else if (currentModuleIndex < course.modules.length - 1) {
          const nextModule = course.modules[currentModuleIndex + 1]
          if (nextModule.lessons.length > 0) {
            nextLesson = nextModule.lessons[0]
          }
        }
        
        if (nextLesson) {
          setSelectedLesson(nextLesson)
        }
        
        // Refresh course data
        await fetchCourseData()
      }
    } catch (error) {
      console.error('Error marking lesson complete:', error)
    }
  }

  const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <BookOpen className="w-16 h-16 text-gold-500/30 mb-4" />
        <h2 className="text-xl font-semibold text-gold-200 mb-2">Curso não encontrado</h2>
        <p className="text-gold-300/70 mb-4">O curso que você está procurando não foi encontrado.</p>
        <Button onClick={() => router.push('/student-dashboard/my-courses')}>
          Voltar aos Meus Cursos
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/student-dashboard/my-courses')}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gold">{course.title}</h1>
          <p className="text-gold-300 mt-1">{course.summary}</p>
        </div>
      </div>

      {/* Progress Overview */}
      <Card variant="gradient" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center justify-center">
            <ProgressRing
              value={completedLessons}
              max={totalLessons}
              size={120}
              showValue={true}
              label="Progresso"
            />
          </div>
          <div className="md:col-span-3 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gold-300/70 text-sm">Aulas Concluídas</p>
                <p className="text-2xl font-bold text-gold">{completedLessons}/{totalLessons}</p>
              </div>
              <div>
                <p className="text-gold-300/70 text-sm">Duração Total</p>
                <p className="text-2xl font-bold text-gold">{course.duration_hours}h</p>
              </div>
              <div>
                <p className="text-gold-300/70 text-sm">Nível</p>
                <p className="text-2xl font-bold text-gold">
                  {course.difficulty === 'beginner' ? 'Iniciante' : 
                   course.difficulty === 'intermediate' ? 'Intermediário' : 'Avançado'}
                </p>
              </div>
            </div>
            {course.instructor && (
              <div className="flex items-center gap-3 pt-2 border-t border-gold-500/20">
                <div className="w-10 h-10 bg-gradient-to-br from-gold-500/30 to-gold-600/20 rounded-full flex items-center justify-center">
                  {course.instructor.avatar ? (
                    <img 
                      src={course.instructor.avatar} 
                      alt={course.instructor.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <Users className="w-5 h-5 text-gold-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gold-300/70">Instrutor</p>
                  <p className="font-medium text-gold-200">{course.instructor.name}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Modules */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-semibold text-gold mb-4">Conteúdo do Curso</h2>
          
          {course.modules.map((module, moduleIndex) => (
            <Card key={module.id} variant="glass">
              <div className="space-y-3">
                <h3 className="font-semibold text-gold-200">{module.title}</h3>
                {module.description && (
                  <p className="text-sm text-gold-300/70">{module.description}</p>
                )}
                
                <div className="space-y-2">
                  {module.lessons.map((lesson, lessonIndex) => {
                    const isCompleted = lesson.progress?.is_completed
                    const isSelected = selectedLesson?.id === lesson.id
                    
                    // Unlock logic: Progressive unlocking
                    let isLocked = false
                    
                    // First lesson of first module is always unlocked
                    if (moduleIndex === 0 && lessonIndex === 0) {
                      isLocked = false
                    }
                    // For other lessons in the first module, check if previous lesson is completed
                    else if (moduleIndex === 0) {
                      isLocked = !module.lessons[lessonIndex - 1]?.progress?.is_completed
                    }
                    // For first lesson of other modules, check if all lessons from previous module are completed
                    else if (lessonIndex === 0) {
                      const previousModule = course.modules[moduleIndex - 1]
                      isLocked = !previousModule.lessons.every(l => l.progress?.is_completed)
                    }
                    // For other lessons in other modules, check if previous lesson in same module is completed
                    else {
                      isLocked = !module.lessons[lessonIndex - 1]?.progress?.is_completed
                    }
                    
                    return (
                      <motion.button
                        key={lesson.id}
                        onClick={() => !isLocked && handleLessonSelect(lesson)}
                        disabled={isLocked}
                        className={`
                          w-full text-left p-3 rounded-lg transition-all relative
                          ${isSelected 
                            ? 'bg-gold-500/20 border border-gold-500/50' 
                            : isCompleted 
                              ? 'bg-green-500/10 hover:bg-green-500/20'
                              : 'bg-navy-800/30 hover:bg-navy-800/50'
                          }
                          ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          ${!isLocked && !isCompleted && !isSelected ? 'ring-2 ring-gold-500/30 animate-pulse' : ''}
                        `}
                        whileHover={!isLocked ? { scale: 1.02 } : {}}
                        whileTap={!isLocked ? { scale: 0.98 } : {}}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            {isLocked ? (
                              <Lock className="w-4 h-4 text-gold-300/50" />
                            ) : isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-gold-500/50" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              isSelected ? 'text-gold' : isCompleted ? 'text-green-400' : 'text-gold-200'
                            }`}>
                              {lesson.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {lesson.content_type === 'video' && <Video className="w-3 h-3 text-gold-400" />}
                              {lesson.content_type === 'text' && lesson.content_url && <Link className="w-3 h-3 text-gold-400" />}
                              {lesson.content_type === 'text' && !lesson.content_url && <FileText className="w-3 h-3 text-gold-400" />}
                              {lesson.content_type === 'document' && <FileImage className="w-3 h-3 text-gold-400" />}
                              {lesson.duration_minutes && (
                                <span className="text-xs text-gold-300/50">
                                  {lesson.duration_minutes} min
                                </span>
                              )}
                              {isLocked && (
                                <span className="text-xs text-red-400">
                                  Complete a aula anterior
                                </span>
                              )}
                              {!isLocked && !isCompleted && !isSelected && (
                                <span className="text-xs text-gold-400 font-semibold">
                                  Disponível
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Lesson Content */}
        <div className="lg:col-span-2">
          {selectedLesson ? (
            <Card variant="premium" className="h-full">
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-gold mb-2">
                      {selectedLesson.title}
                    </h2>
                    {selectedLesson.description && (
                      <p className="text-gold-300/70">{selectedLesson.description}</p>
                    )}
                  </div>
                  {(selectedLesson as any).progress?.is_completed && (
                    <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400">Concluída</span>
                    </div>
                  )}
                </div>

                {/* Lesson Content */}
                <div className="bg-navy-900/50 rounded-lg p-6 min-h-[400px]">
                  {selectedLesson.content_type === 'video' ? (
                    selectedLesson.content_url ? (
                      <VideoPlayer
                        url={selectedLesson.content_url}
                        title={selectedLesson.title}
                        onComplete={() => markLessonComplete(selectedLesson.id)}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-[400px]">
                        <div className="text-center">
                          <Video className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
                          <p className="text-gold-300">Vídeo não disponível</p>
                          <p className="text-gold-300/50 text-sm mt-2">
                            Nenhuma URL de vídeo foi configurada para esta aula
                          </p>
                        </div>
                      </div>
                    )
                  ) : selectedLesson.content_type === 'text' ? (
                    // Verificar se há URL de documento primeiro
                    selectedLesson.content_url ? (
                      <DocumentViewer
                        url={selectedLesson.content_url}
                        title={selectedLesson.title}
                        onComplete={() => markLessonComplete(selectedLesson.id)}
                      />
                    ) : (
                      <div className="w-full h-[400px] overflow-y-auto">
                        <div className="prose prose-gold max-w-none">
                          {selectedLesson.content ? (
                            <div 
                              className="text-gold-200 leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: selectedLesson.content }}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <div className="text-center">
                                <FileText className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
                                <p className="text-gold-300">Conteúdo não disponível</p>
                                <p className="text-gold-300/50 text-sm mt-2">
                                  Nenhum documento ou texto foi configurado para esta aula
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  ) : selectedLesson.content_type === 'document' ? (
                    // Novo tipo: documento
                    selectedLesson.content_url ? (
                      <DocumentViewer
                        url={selectedLesson.content_url}
                        title={selectedLesson.title}
                        onComplete={() => markLessonComplete(selectedLesson.id)}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-[400px]">
                        <div className="text-center">
                          <FileText className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
                          <p className="text-gold-300">Documento não disponível</p>
                          <p className="text-gold-300/50 text-sm mt-2">
                            Nenhuma URL de documento foi configurada para esta aula
                          </p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-center h-[400px]">
                      <div className="text-center">
                        <BookOpen className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
                        <p className="text-gold-300">Tipo de conteúdo não suportado</p>
                        <p className="text-gold-300/50 text-sm mt-2">
                          Tipo: {selectedLesson.content_type}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lesson Actions */}
                <div className="flex justify-between items-center pt-4 border-t border-gold-500/20">
                  <div className="flex items-center gap-2 text-sm text-gold-300/70">
                    <Clock className="w-4 h-4" />
                    <span>{selectedLesson.duration_minutes || 0} minutos</span>
                  </div>
                  
                  {!(selectedLesson as any).progress?.is_completed && (
                    <Button 
                      variant="primary"
                      onClick={() => markLessonComplete(selectedLesson.id)}
                      icon={<CheckCircle2 className="w-4 h-4" />}
                    >
                      Marcar como Concluída
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center">
                <BookOpen className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
                <p className="text-gold-300">Selecione uma aula para começar</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
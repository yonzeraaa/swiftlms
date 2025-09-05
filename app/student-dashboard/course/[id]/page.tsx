'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
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
  Link,
  Eye,
  Send,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import Card from '../../../components/Card'
import Button from '../../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import ProgressRing from '../../../components/ui/ProgressRing'
import { motion, AnimatePresence } from 'framer-motion'
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
  const searchParams = useSearchParams()
  const courseId = params.id as string
  const lessonId = searchParams.get('lesson')
  const supabase = createClient()

  const [course, setCourse] = useState<CourseWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [totalLessons, setTotalLessons] = useState(0)
  const [completedLessons, setCompletedLessons] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [certificateStatus, setCertificateStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none')
  const [canRequestCertificate, setCanRequestCertificate] = useState(false)
  const [requestingCertificate, setRequestingCertificate] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (courseId) {
      fetchCourseData()
    }
  }, [courseId])

  // Auto-expand module that contains selected lesson and expand first module by default
  useEffect(() => {
    if (course && course.modules.length > 0) {
      if (selectedLesson) {
        // Find which module contains the selected lesson
        const moduleWithSelectedLesson = course.modules.find(module =>
          module.lessons.some(lesson => lesson.id === selectedLesson.id)
        )
        
        if (moduleWithSelectedLesson) {
          setExpandedModules(prev => new Set(prev).add(moduleWithSelectedLesson.id))
        }
      } else {
        // Expand the first module by default when no lesson is selected
        setExpandedModules(new Set([course.modules[0].id]))
      }
    }
  }, [selectedLesson, course])

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

      // Check if user is admin
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      const isAdmin = profileData?.role === 'admin'
      setIsAdmin(isAdmin)

      // Fetch enrollment (skip for admin)
      let enrollmentData = null
      if (!isAdmin) {
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('*')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .single()

        if (!enrollment) {
          router.push('/student-dashboard/courses')
          return
        }
        enrollmentData = enrollment
      }

      // Fetch modules with subjects and lessons
      const { data: modulesData } = await supabase
        .from('course_modules')
        .select(`
          *,
          module_subjects (
            subject:subjects (
              *,
              subject_lessons (
                lesson:lessons (*)
              )
            ),
            order_index
          )
        `)
        .eq('course_id', courseId)
        .order('order_index')

      // Fetch lesson progress (only for enrolled students)
      let progressData: any[] = []
      if (enrollmentData) {
        const { data } = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('enrollment_id', enrollmentData.id)
        progressData = data || []
      }

      // Process modules and lessons with progress
      const modulesWithProgress: ModuleWithLessons[] = []
      let totalLessonCount = 0
      let completedLessonCount = 0
      let firstIncompleteLesson: Lesson | null = null

      if (modulesData) {
        for (const module of modulesData) {
          const allLessons: (Lesson & { progress?: LessonProgress })[] = []
          
          // Extract lessons from module_subjects -> subjects -> subject_lessons -> lessons
          const moduleSubjects = (module as any).module_subjects || []
          
          // Sort module_subjects by order_index
          moduleSubjects.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
          
          for (const moduleSubject of moduleSubjects) {
            if (moduleSubject.subject && moduleSubject.subject.subject_lessons) {
              for (const subjectLesson of moduleSubject.subject.subject_lessons) {
                if (subjectLesson.lesson) {
                  const lesson = subjectLesson.lesson
                  const progress = progressData?.find(p => p.lesson_id === lesson.id)
                  
                  if (progress?.is_completed) {
                    completedLessonCount++
                  } else if (!firstIncompleteLesson) {
                    firstIncompleteLesson = lesson
                  }
                  
                  totalLessonCount++
                  allLessons.push({ ...lesson, progress })
                }
              }
            }
          }

          // Sort lessons by order_index
          allLessons.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))

          modulesWithProgress.push({
            ...module,
            lessons: allLessons
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
        enrollment: enrollmentData || undefined,
        instructor: instructorInfo
      })

      setTotalLessons(totalLessonCount)
      setCompletedLessons(completedLessonCount)
      
      // Verificar status do certificado e elegibilidade
      if (enrollmentData) {
        // Verificar se já existe certificado ou solicitação
        const { data: certificateRequest } = await supabase
          .from('certificate_requests')
          .select('status')
          .eq('enrollment_id', enrollmentData.id)
          .single()
        
        const { data: certificate } = await supabase
          .from('certificates')
          .select('approval_status')
          .eq('enrollment_id', enrollmentData.id)
          .single()
        
        if (certificate?.approval_status === 'approved') {
          setCertificateStatus('approved')
        } else if (certificateRequest?.status === 'pending') {
          setCertificateStatus('pending')
        } else if (certificateRequest?.status === 'rejected') {
          setCertificateStatus('rejected')
        }
        
        // Verificar elegibilidade para solicitar certificado
        const progressPercentage = totalLessonCount > 0 
          ? (completedLessonCount / totalLessonCount) * 100 
          : 0
        
        // Verificar nota no teste
        const { data: testGrades } = await supabase
          .from('test_grades')
          .select('best_score')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
        
        const bestScore = testGrades && testGrades.length > 0 
          ? Math.max(...testGrades.map((g: any) => g.best_score || 0))
          : 0
        
        // Pode solicitar se completou 100% e tem nota >= 70
        const eligible = progressPercentage >= 100 && bestScore >= 70
        setCanRequestCertificate(eligible && certificateStatus === 'none')
      }
      
      // If there's a lesson ID in the URL, select that lesson
      if (lessonId) {
        const lessonToSelect = modulesWithProgress
          .flatMap(m => m.lessons)
          .find(l => l.id === lessonId)
        if (lessonToSelect) {
          setSelectedLesson(lessonToSelect)
        }
      } else if (firstIncompleteLesson) {
        // Otherwise, set the first incomplete lesson as selected
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

  const toggleModuleExpansion = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev)
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId)
      } else {
        newSet.add(moduleId)
      }
      return newSet
    })
  }

  const calculateModuleProgress = (module: ModuleWithLessons) => {
    const totalLessons = module.lessons.length
    const completedLessons = module.lessons.filter(lesson => lesson.progress?.is_completed).length
    return { completed: completedLessons, total: totalLessons }
  }

  const markAllLessonsComplete = async () => {
    if (!course?.enrollment) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Mark all lessons as complete
      const allLessons = course.modules.flatMap(m => m.lessons)
      
      for (const lesson of allLessons) {
        await supabase
          .from('lesson_progress')
          .upsert({
            enrollment_id: course.enrollment.id,
            lesson_id: lesson.id,
            user_id: user.id,
            is_completed: true,
            completed_at: new Date().toISOString()
          })
      }

      // Update enrollment progress to 100%
      const updateData: any = { 
        progress_percentage: 100,
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      await supabase
        .from('enrollments')
        .update(updateData)
        .eq('id', course.enrollment.id)
      
      // Show success message
      alert('🎉 Todas as aulas foram marcadas como concluídas!\n\n📜 Seu certificado será emitido pela administração em breve.')
      
      // Refresh course data
      await fetchCourseData()
    } catch (error) {
      console.error('Error marking all lessons complete:', error)
      alert('Erro ao marcar todas as aulas como concluídas')
    }
  }

  const requestCertificate = async () => {
    if (!course?.enrollment || !canRequestCertificate) return
    
    setRequestingCertificate(true)
    
    try {
      const response = await fetch('/api/certificates/check-eligibility', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          enrollmentId: course.enrollment.id
        })
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        setCertificateStatus('pending')
        setCanRequestCertificate(false)
        alert('✅ Certificado solicitado com sucesso!\n\nAguarde a aprovação do administrador.')
      } else {
        alert(`❌ Erro ao solicitar certificado:\n\n${result.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('Erro ao solicitar certificado:', error)
      alert('❌ Erro ao solicitar certificado. Tente novamente.')
    } finally {
      setRequestingCertificate(false)
    }
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
        // Calculate new progress
        const newCompletedLessons = completedLessons + 1
        const progressPercentage = totalLessons > 0 
          ? Math.round((newCompletedLessons / totalLessons) * 100)
          : 0
        
        // Update enrollment progress and status if course is completed
        const updateData: any = { 
          progress_percentage: progressPercentage,
          updated_at: new Date().toISOString()
        }
        
        // If course is 100% complete, update status
        if (progressPercentage === 100) {
          updateData.status = 'completed'
          updateData.completed_at = new Date().toISOString()
          
          // Update enrollment
          await supabase
            .from('enrollments')
            .update(updateData)
            .eq('id', course.enrollment.id)
          
          // Show success message (certificate will be issued by admin)
          alert('🎉 Parabéns! Você concluiu este curso com sucesso!\n\n📜 Seu certificado será emitido pela administração em breve.')
        } else {
          // Just update progress
          await supabase
            .from('enrollments')
            .update(updateData)
            .eq('id', course.enrollment.id)
        }
        
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
      {/* Admin Mode Indicator */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-400">Modo Preview Administrador</p>
                <p className="text-xs text-gold-400">Você está visualizando este curso como um administrador</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/dashboard')}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Voltar ao Painel Admin
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => router.push(isAdmin ? '/dashboard/lessons' : '/student-dashboard/my-courses')}
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
            {/* Mark All Complete Button */}
            {completedLessons < totalLessons && (
              <div className="mt-4">
                <Button 
                  onClick={markAllLessonsComplete}
                  variant="secondary"
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Marcar todas as aulas como concluídas
                </Button>
              </div>
            )}
            
            {/* Certificate Status and Request Button */}
            {!isAdmin && (
              <div className="mt-4 space-y-3">
                {certificateStatus === 'approved' && (
                  <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                    <Award className="w-5 h-5 text-green-400" />
                    <span className="text-green-400">Certificado aprovado! Acesse em "Meus Certificados"</span>
                  </div>
                )}
                
                {certificateStatus === 'pending' && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400">Certificado solicitado - Aguardando aprovação</span>
                  </div>
                )}
                
                {certificateStatus === 'rejected' && (
                  <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400">Certificado rejeitado - Verifique em "Meus Certificados"</span>
                  </div>
                )}
                
                {canRequestCertificate && (
                  <Button
                    variant="primary"
                    onClick={requestCertificate}
                    loading={requestingCertificate}
                    icon={<Send className="w-4 h-4" />}
                    className="w-full"
                  >
                    Solicitar Certificado de Conclusão
                  </Button>
                )}
                
                {!canRequestCertificate && certificateStatus === 'none' && progressPercentage === 100 && (
                  <div className="flex items-center gap-2 p-3 bg-navy-900/50 border border-gold-500/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-gold-400" />
                    <span className="text-gold-400 text-sm">
                      Você precisa atingir nota mínima de 70% no teste para solicitar o certificado
                    </span>
                  </div>
                )}
              </div>
            )}
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
          
          {course.modules.map((module, moduleIndex) => {
            const isExpanded = expandedModules.has(module.id)
            const moduleProgress = calculateModuleProgress(module)
            const isModuleCompleted = moduleProgress.completed === moduleProgress.total && moduleProgress.total > 0
            
            return (
              <Card key={module.id} variant="glass">
                <div className="space-y-3">
                  {/* Module Header - Clickable */}
                  <motion.button
                    onClick={() => toggleModuleExpansion(module.id)}
                    className="w-full text-left flex items-center justify-between gap-3 p-3 -m-3 rounded-lg transition-all hover:bg-navy-800/30"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold break-words ${
                        isModuleCompleted ? 'text-green-400' : 'text-gold-200'
                      }`}>
                        {module.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gold-300/50">
                          {moduleProgress.completed}/{moduleProgress.total} aulas concluídas
                        </span>
                        {isModuleCompleted && (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-400" />
                            <span className="text-xs text-green-400">Completo</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gold-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gold-400" />
                      )}
                    </div>
                  </motion.button>

                  {module.description && (
                    <p className="text-sm text-gold-300/70">{module.description}</p>
                  )}
                  
                  {/* Lessons - Collapsible */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 pt-2">
                          {module.lessons.map((lesson, lessonIndex) => {
                            const isCompleted = lesson.progress?.is_completed
                            const isSelected = selectedLesson?.id === lesson.id
                            
                            // All lessons are unlocked - student can watch in any order
                            const isLocked = false
                            
                            return (
                              <motion.button
                                key={lesson.id}
                                onClick={() => handleLessonSelect(lesson)}
                                className={`
                                  w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative
                                  ${isSelected 
                                    ? 'bg-gold-500/20 text-gold shadow-lg shadow-gold-500/10' 
                                    : isCompleted 
                                      ? 'text-green-400 hover:bg-green-500/10'
                                      : 'text-gold-300 hover:bg-navy-800/50 hover:text-gold-200'
                                  }
                                  cursor-pointer
                                `}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className="flex-shrink-0">
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-gold-500/50" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate whitespace-nowrap">
                                    {lesson.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {lesson.content_type === 'video' && <Video className="w-3 h-3 text-gold-400" />}
                                    {lesson.content_type === 'text' && lesson.content_url && <Link className="w-3 h-3 text-gold-400" />}
                                    {lesson.content_type === 'text' && !lesson.content_url && <FileText className="w-3 h-3 text-gold-400" />}
                                    {lesson.content_type === 'document' && <FileImage className="w-3 h-3 text-gold-400" />}
                                    {lesson.duration_minutes && (
                                      <span className="text-xs text-gold-300/50 truncate">
                                        {lesson.duration_minutes} min
                                      </span>
                                    )}
                                    {!isCompleted && !isSelected && (
                                      <span className="text-xs text-gold-400 truncate">
                                        Disponível
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </motion.button>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Card>
            )
          })}
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
                <div className="bg-navy-900/50 rounded-lg overflow-hidden">
                  {selectedLesson.content_type === 'video' ? (
                    selectedLesson.content_url ? (
                      <VideoPlayer
                        url={selectedLesson.content_url}
                        title={selectedLesson.title}
                        onComplete={() => {/* Removed auto-complete */}}
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
                        onComplete={() => {/* Removed auto-complete */}}
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
                        onComplete={() => {/* Removed auto-complete */}}
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
                      Marcar esta aula como concluída
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
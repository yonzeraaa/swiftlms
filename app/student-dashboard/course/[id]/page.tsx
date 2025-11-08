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
  ChevronUp,
  Star
} from 'lucide-react'
import Card from '../../../components/Card'
import Button from '../../../components/Button'
import Tabs from '../../../components/Tabs'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import ProgressRing from '../../../components/ui/ProgressRing'
import { motion, AnimatePresence } from 'framer-motion'
import VideoPlayer from '../../components/VideoPlayer'
import DocumentViewer from '../../components/DocumentViewer'
import Spinner from '../../../components/ui/Spinner'
import Breadcrumbs from '../../../components/ui/Breadcrumbs'

type Course = Database['public']['Tables']['courses']['Row']
type CourseModule = Database['public']['Tables']['course_modules']['Row']
type Subject = Database['public']['Tables']['subjects']['Row']
type Lesson = Database['public']['Tables']['lessons']['Row']
type LessonProgress = Database['public']['Tables']['lesson_progress']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']

interface SubjectWithLessons extends Subject {
  lessons: (Lesson & { progress?: LessonProgress })[]
  order_index: number
}

interface ModuleWithSubjects extends CourseModule {
  subjects: SubjectWithLessons[]
}

interface CourseWithDetails extends Course {
  modules: ModuleWithSubjects[]
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
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const [hasApprovedTcc, setHasApprovedTcc] = useState(false)
  const [eligibilityData, setEligibilityData] = useState<any>(null)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const [reviews, setReviews] = useState<any[]>([])
  const [courseTests, setCourseTests] = useState<any[]>([])
  const [loadingTests, setLoadingTests] = useState(true)

  useEffect(() => {
    if (courseId) {
      fetchCourseData()
      fetchCourseTests()
    }
  }, [courseId])

  // Auto-expand module and subject that contains selected lesson and expand first module/subject by default
  useEffect(() => {
    if (course && course.modules.length > 0) {
      if (selectedLesson) {
        // Find which module and subject contain the selected lesson
        for (const module of course.modules) {
          for (const subject of module.subjects) {
            if (subject.lessons.some(lesson => lesson.id === selectedLesson.id)) {
              setExpandedModules(prev => new Set(prev).add(module.id))
              setExpandedSubjects(prev => new Set(prev).add(subject.id))
              return
            }
          }
        }
      } else {
        // Expand the first module and first subject by default when no lesson is selected
        setExpandedModules(new Set([course.modules[0].id]))
        if (course.modules[0].subjects.length > 0) {
          setExpandedSubjects(new Set([course.modules[0].subjects[0].id]))
        }
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

      // Fetch module assignments for this enrollment
      let allowedModuleIds: string[] | null = null
      if (enrollmentData) {
        const { data: enrollmentModules, error: enrollmentModulesError } = await supabase
          .from('enrollment_modules')
          .select('module_id')
          .eq('enrollment_id', enrollmentData.id)

        if (enrollmentModulesError) {
          console.error('Erro ao carregar módulos da matrícula:', enrollmentModulesError)
        } else {
          allowedModuleIds = (enrollmentModules || [])
            .map((moduleEntry: { module_id: string | null }) => moduleEntry.module_id)
            .filter((moduleId: string | null): moduleId is string => typeof moduleId === 'string')
        }
      }

      // Fetch modules with subjects and lessons, limited to assigned modules when applicable
      let modulesData: any[] = []

      if (allowedModuleIds !== null && allowedModuleIds.length === 0) {
        modulesData = []
      } else {
        let modulesQuery = supabase
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

        if (allowedModuleIds && allowedModuleIds.length > 0) {
          modulesQuery = modulesQuery.in('id', allowedModuleIds)
        }

        const { data } = await modulesQuery
        modulesData = data || []
      }

      // Fetch lesson progress (only for enrolled students)
      let progressData: any[] = []
      if (enrollmentData) {
        const { data } = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('enrollment_id', enrollmentData.id)
        progressData = data || []
      }

      // Process modules with subjects and lessons with progress
      const modulesWithProgress: ModuleWithSubjects[] = []
      let totalLessonCount = 0
      let completedLessonCount = 0
      let firstIncompleteLesson: Lesson | null = null

      if (modulesData) {
        for (const module of modulesData) {
          const subjectsWithLessons: SubjectWithLessons[] = []
          
          // Extract subjects from module_subjects
          const moduleSubjects = (module as any).module_subjects || []
          
          // Sort module_subjects by order_index
          moduleSubjects.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
          
          for (const moduleSubject of moduleSubjects) {
            if (moduleSubject.subject) {
              const subject = moduleSubject.subject
              const lessonsInSubject: (Lesson & { progress?: LessonProgress })[] = []
              
              // Extract lessons from subject_lessons
              if (subject.subject_lessons) {
                for (const subjectLesson of subject.subject_lessons) {
                  if (subjectLesson.lesson) {
                    const lesson = subjectLesson.lesson
                    const progress = progressData?.find(p => p.lesson_id === lesson.id)
                    
                    if (progress?.is_completed) {
                      completedLessonCount++
                    } else if (!firstIncompleteLesson) {
                      firstIncompleteLesson = lesson
                    }
                    
                    totalLessonCount++
                    lessonsInSubject.push({ ...lesson, progress })
                  }
                }
              }

              // Sort lessons by order_index
              lessonsInSubject.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))

              // Add subject with its lessons
              subjectsWithLessons.push({
                ...subject,
                lessons: lessonsInSubject,
                order_index: moduleSubject.order_index || 0
              })
            }
          }

          modulesWithProgress.push({
            ...module,
            subjects: subjectsWithLessons
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
      
      // Verificar elegibilidade completa usando a API
      if (enrollmentData) {
        try {
          const response = await fetch('/api/certificates/check-eligibility', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              courseId: courseId,
              enrollmentId: enrollmentData.id
            })
          })

          if (response.ok) {
            const eligibility = await response.json()
            setEligibilityData(eligibility)
            setHasApprovedTcc(eligibility.hasApprovedTcc || false)

            // Determinar status baseado nos dados de elegibilidade
            const hasTechnicalRequest = eligibility.requestsByType?.technical
            const hasLatoSensuRequest = eligibility.requestsByType?.latoSensu
            const hasTechnicalCertificate = eligibility.approvedCertificatesByType?.technical
            const hasLatoSensuCertificate = eligibility.approvedCertificatesByType?.latoSensu

            // Se tem algum certificado aprovado
            if (hasTechnicalCertificate || hasLatoSensuCertificate) {
              setCertificateStatus('approved')
            }
            // Se tem alguma solicitação pendente
            else if (
              hasTechnicalRequest?.status === 'pending' ||
              hasLatoSensuRequest?.status === 'pending'
            ) {
              setCertificateStatus('pending')
            }
            // Se tem alguma solicitação rejeitada
            else if (
              hasTechnicalRequest?.status === 'rejected' ||
              hasLatoSensuRequest?.status === 'rejected'
            ) {
              setCertificateStatus('rejected')
            }

            // Pode solicitar se atende requisitos e não tem solicitação/certificado
            const canRequestTechnical = eligibility.eligibleCertificates?.technical && !hasTechnicalRequest && !hasTechnicalCertificate
            const canRequestLatoSensu = eligibility.eligibleCertificates?.latoSensu && !hasLatoSensuRequest && !hasLatoSensuCertificate

            setCanRequestCertificate(canRequestTechnical || canRequestLatoSensu)
          }
        } catch (error) {
          console.error('Erro ao verificar elegibilidade:', error)
        }
      }
      
      // If there's a lesson ID in the URL, select that lesson
      if (lessonId) {
        const lessonToSelect = modulesWithProgress
          .flatMap(m => m.subjects)
          .flatMap(s => s.lessons)
          .find(l => l.id === lessonId)
        if (lessonToSelect) {
          setSelectedLesson(lessonToSelect)
        }
      } else if (firstIncompleteLesson) {
        // Otherwise, set the first incomplete lesson as selected
        setSelectedLesson(firstIncompleteLesson)
      } else if (modulesWithProgress.length > 0 && 
                 modulesWithProgress[0].subjects.length > 0 && 
                 modulesWithProgress[0].subjects[0].lessons.length > 0) {
        setSelectedLesson(modulesWithProgress[0].subjects[0].lessons[0])
      }

      // Fetch course reviews (lightweight)
      const { data: courseReviews } = await supabase
        .from('course_reviews')
        .select('rating, title, comment, created_at')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })

      setReviews(courseReviews || [])

    } catch (error) {
      console.error('Error fetching course data:', error)
      router.push('/student-dashboard/my-courses')
    } finally {
      setLoading(false)
    }
  }

  const fetchCourseTests = async () => {
    try {
      setLoadingTests(true)
      const response = await fetch(`/api/student/tests?course_id=${courseId}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
        console.error('Erro da API (curso):', response.status, errorData)
        throw new Error(errorData.error || 'Erro ao buscar testes')
      }

      const result = await response.json()

      if (result.success && result.data) {
        // Extrair apenas os testes (sem agrupar por curso)
        const tests = result.data.courseTests?.[0]?.tests || []
        setCourseTests(tests)
      }
    } catch (error) {
      console.error('Erro ao carregar testes do curso:', error)
      setCourseTests([])
    } finally {
      setLoadingTests(false)
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

  const toggleSubjectExpansion = (subjectId: string) => {
    setExpandedSubjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(subjectId)) {
        newSet.delete(subjectId)
      } else {
        newSet.add(subjectId)
      }
      return newSet
    })
  }

  const calculateModuleProgress = (module: ModuleWithSubjects) => {
    let totalLessons = 0
    let completedLessons = 0
    
    for (const subject of module.subjects) {
      totalLessons += subject.lessons.length
      completedLessons += subject.lessons.filter(lesson => lesson.progress?.is_completed).length
    }
    
    return { completed: completedLessons, total: totalLessons }
  }

  const calculateSubjectProgress = (subject: SubjectWithLessons) => {
    const totalLessons = subject.lessons.length
    const completedLessons = subject.lessons.filter(lesson => lesson.progress?.is_completed).length
    return { completed: completedLessons, total: totalLessons }
  }

  const markAllLessonsComplete = async () => {
    if (!course?.enrollment) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Mark all lessons as complete
      const allLessons = course.modules.flatMap(m => m.subjects).flatMap(s => s.lessons)
      
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

  const requestCertificate = async (certificateType: 'technical' | 'lato-sensu') => {
    if (!course?.enrollment || !canRequestCertificate) return

    setRequestingCertificate(true)

    try {
      const response = await fetch('/api/certificates/check-eligibility', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          enrollmentId: course.enrollment.id,
          certificateType: certificateType
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setShowCertificateModal(false)
        await fetchCourseData() // Recarregar dados para atualizar status
        alert(`✅ Certificado ${certificateType === 'lato-sensu' ? 'Lato Sensu' : 'Técnico'} solicitado com sucesso!\n\nAguarde a aprovação do administrador.`)
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
        let nextLesson = null
        
        // Find current lesson in the hierarchy
        for (let moduleIndex = 0; moduleIndex < course.modules.length; moduleIndex++) {
          const module = course.modules[moduleIndex]
          for (let subjectIndex = 0; subjectIndex < module.subjects.length; subjectIndex++) {
            const subject = module.subjects[subjectIndex]
            const lessonIndex = subject.lessons.findIndex(l => l.id === lessonId)
            
            if (lessonIndex !== -1) {
              // Try next lesson in same subject
              if (lessonIndex < subject.lessons.length - 1) {
                nextLesson = subject.lessons[lessonIndex + 1]
              }
              // Try first lesson of next subject in same module
              else if (subjectIndex < module.subjects.length - 1) {
                const nextSubject = module.subjects[subjectIndex + 1]
                if (nextSubject.lessons.length > 0) {
                  nextLesson = nextSubject.lessons[0]
                }
              }
              // Try first lesson of first subject in next module
              else if (moduleIndex < course.modules.length - 1) {
                const nextModule = course.modules[moduleIndex + 1]
                if (nextModule.subjects.length > 0 && nextModule.subjects[0].lessons.length > 0) {
                  nextLesson = nextModule.subjects[0].lessons[0]
                }
              }
              break
            }
          }
          if (nextLesson) break
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

  const CertificatePanel = () => {
    if (isAdmin) return null

    const technicalRequest = eligibilityData?.requestsByType?.technical
    const latoSensuRequest = eligibilityData?.requestsByType?.latoSensu
    const technicalCertificate = eligibilityData?.approvedCertificatesByType?.technical
    const latoSensuCertificate = eligibilityData?.approvedCertificatesByType?.latoSensu

    const canRequestTechnical = eligibilityData?.eligibleCertificates?.technical && !technicalRequest && !technicalCertificate
    const canRequestLatoSensu = eligibilityData?.eligibleCertificates?.latoSensu && !latoSensuRequest && !latoSensuCertificate

    return (
      <div className="mt-4 space-y-3">
        {/* Certificados aprovados */}
        {technicalCertificate && (
          <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
            <Award className="w-5 h-5 text-green-400" />
            <span className="text-green-400">Certificado Técnico aprovado! Acesse em \"Meus Certificados\"</span>
          </div>
        )}
        {latoSensuCertificate && (
          <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
            <Award className="w-5 h-5 text-green-400" />
            <span className="text-green-400">Certificado Lato Sensu aprovado! Acesse em \"Meus Certificados\"</span>
          </div>
        )}

        {/* Solicitações pendentes */}
        {technicalRequest?.status === 'pending' && (
          <div className="flex items-center gap-2 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <Clock className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400">Certificado Técnico solicitado - Aguardando aprovação</span>
          </div>
        )}
        {latoSensuRequest?.status === 'pending' && (
          <div className="flex items-center gap-2 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <Clock className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400">Certificado Lato Sensu solicitado - Aguardando aprovação</span>
          </div>
        )}

        {/* Solicitações rejeitadas */}
        {technicalRequest?.status === 'rejected' && (
          <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400">Certificado Técnico rejeitado - Verifique em \"Meus Certificados\"</span>
          </div>
        )}
        {latoSensuRequest?.status === 'rejected' && (
          <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400">Certificado Lato Sensu rejeitado - Verifique em \"Meus Certificados\"</span>
          </div>
        )}

        {/* Botão para solicitar certificados */}
        {canRequestCertificate && (
          <Button
            variant="primary"
            onClick={() => setShowCertificateModal(true)}
            icon={<Send className="w-4 h-4" />}
            className="w-full"
          >
            Solicitar Certificado de Conclusão
          </Button>
        )}

        {/* Mensagens de requisitos não atendidos */}
        {!canRequestCertificate && !technicalCertificate && !latoSensuCertificate && !technicalRequest && !latoSensuRequest && (
          <>
            {eligibilityData && eligibilityData.progressPercentage < 100 && (
              <div className="flex items-center gap-2 p-3 bg-navy-900/50 border border-gold-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-gold-400" />
                <span className="text-gold-400 text-sm">
                  Complete todas as aulas do curso (atualmente em {Math.round(eligibilityData.progressPercentage)}%)
                </span>
              </div>
            )}
            {eligibilityData && eligibilityData.progressPercentage >= 100 && eligibilityData.bestTestScore < 70 && (
              <div className="flex items-center gap-2 p-3 bg-navy-900/50 border border-gold-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-gold-400" />
                <span className="text-gold-400 text-sm">
                  Você precisa atingir nota mínima de 70% no teste (nota atual: {eligibilityData.bestTestScore}%)
                </span>
              </div>
            )}
          </>
        )}

        {/* Modal de seleção de tipo de certificado */}
        <AnimatePresence>
          {showCertificateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowCertificateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-navy-800 rounded-lg p-6 max-w-md w-full border border-gold-500/20"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-gold mb-4">Escolha o Tipo de Certificado</h3>
                <p className="text-gold-300/70 mb-6 text-sm">
                  Selecione o tipo de certificado que você deseja solicitar:
                </p>

                <div className="space-y-3">
                  {/* Certificado Técnico */}
                  {canRequestTechnical && (
                    <button
                      onClick={() => requestCertificate('technical')}
                      disabled={requestingCertificate}
                      className="w-full p-4 bg-navy-900/50 border border-gold-500/20 rounded-lg hover:border-gold-500/40 hover:bg-navy-900/70 transition-all text-left group"
                    >
                      <div className="flex items-start gap-3">
                        <Award className="w-6 h-6 text-gold-400 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h4 className="text-gold-200 font-semibold mb-1 group-hover:text-gold">
                            Certificado Técnico
                          </h4>
                          <p className="text-gold-300/60 text-sm">
                            Certifica a conclusão do curso com aproveitamento mínimo de 70%
                          </p>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Certificado Lato Sensu */}
                  {canRequestLatoSensu && (
                    <button
                      onClick={() => requestCertificate('lato-sensu')}
                      disabled={requestingCertificate}
                      className="w-full p-4 bg-gradient-to-br from-gold-900/20 to-gold-800/10 border border-gold-500/30 rounded-lg hover:border-gold-500/50 hover:from-gold-900/30 hover:to-gold-800/20 transition-all text-left group"
                    >
                      <div className="flex items-start gap-3">
                        <Star className="w-6 h-6 text-gold-400 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h4 className="text-gold font-semibold mb-1 group-hover:text-gold-300">
                            Certificado Lato Sensu
                          </h4>
                          <p className="text-gold-300/70 text-sm">
                            Certificado de pós-graduação com TCC aprovado
                          </p>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Mensagem caso nenhum esteja disponível */}
                  {!canRequestTechnical && !canRequestLatoSensu && (
                    <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                      <p className="text-red-400 text-sm">
                        Nenhum certificado disponível para solicitação no momento.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <Button
                    variant="ghost"
                    onClick={() => setShowCertificateModal(false)}
                    disabled={requestingCertificate}
                  >
                    Cancelar
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="xl" />
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
      <Breadcrumbs className="mb-2" />
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
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold">{course.title}</h1>
          <p className="text-gold-300 mt-1">{course.summary}</p>
        </div>
      </div>

      {/* Progress Overview */}
      <Card variant="gradient" className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
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
            <CertificatePanel />
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
            const totalHours = typeof module.total_hours === 'number' ? module.total_hours : 0
            const formattedHours = Number.isInteger(totalHours)
              ? totalHours.toFixed(0)
              : totalHours.toFixed(1)
            
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
                        <span className="text-xs text-gold-300/50 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formattedHours.replace('.', ',')}h
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
                  
                  {/* Subjects - Collapsible */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 pt-2">
                          {module.subjects.map((subject, subjectIndex) => {
                            const isSubjectExpanded = expandedSubjects.has(subject.id)
                            const subjectProgress = calculateSubjectProgress(subject)
                            const isSubjectCompleted = subjectProgress.completed === subjectProgress.total && subjectProgress.total > 0
                            
                            return (
                              <div key={subject.id} className="border-l-2 border-gold-500/20 pl-4">
                                {/* Subject Header */}
                                <motion.button
                                  onClick={() => toggleSubjectExpansion(subject.id)}
                                  className="w-full text-left flex items-center justify-between gap-3 p-2 -m-2 rounded-lg transition-all hover:bg-navy-800/20"
                                  whileHover={{ scale: 1.005 }}
                                  whileTap={{ scale: 0.995 }}
                                >
                                  <div className="flex-1 min-w-0">
                                    <h4 className={`text-sm font-medium break-words ${
                                      isSubjectCompleted ? 'text-green-400' : 'text-gold-300'
                                    }`}>
                                      📚 {subject.code ? `${subject.code} - ${subject.name}` : subject.name}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-gold-300/40">
                                        {subjectProgress.completed}/{subjectProgress.total} aulas
                                      </span>
                                      {isSubjectCompleted && (
                                        <div className="flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                                          <span className="text-xs text-green-400">Completo</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0">
                                    {isSubjectExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-gold-400" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-gold-400" />
                                    )}
                                  </div>
                                </motion.button>

                                {subject.description && (
                                  <p className="text-xs text-gold-300/60 mt-1 pl-2">{subject.description}</p>
                                )}

                                {/* Lessons in Subject */}
                                <AnimatePresence>
                                  {isSubjectExpanded && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                                      className="overflow-hidden"
                                    >
                                      <div className="space-y-1 pt-2 pl-2">
                                        {subject.lessons.map((lesson, lessonIndex) => {
                                          const isCompleted = lesson.progress?.is_completed
                                          const isSelected = selectedLesson?.id === lesson.id
                                          
                                          return (
                                            <motion.button
                                              key={lesson.id}
                                              onClick={() => handleLessonSelect(lesson)}
                                              className={`
                                                w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-all group relative
                                                ${isSelected 
                                                  ? 'bg-gold-500/20 text-gold shadow-lg shadow-gold-500/10' 
                                                  : isCompleted 
                                                    ? 'text-green-400 hover:bg-green-500/10'
                                                    : 'text-gold-300 hover:bg-navy-800/50 hover:text-gold-200'
                                                }
                                                cursor-pointer
                                              `}
                                              whileHover={{ scale: 1.01 }}
                                              whileTap={{ scale: 0.99 }}
                                            >
                                              <div className="flex-shrink-0">
                                                {isCompleted ? (
                                                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                ) : (
                                                  <div className="w-4 h-4 rounded-full border-2 border-gold-500/50" />
                                                )}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium truncate whitespace-nowrap">
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

        {/* Right Column with Tabs */}
        <div className="lg:col-span-2">
          <Tabs
            variant="underline"
            tabs={[
              {
                id: 'conteudo',
                label: 'Conteúdo',
                content: (
                  selectedLesson ? (
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
                  )
                )
              },
              {
                id: 'progresso',
                label: 'Progresso',
                content: (
                  <Card>
                    <div className="space-y-6">
                      <div>
                        <p className="text-gold-300 text-sm mb-2">Progresso do curso</p>
                        <div className="w-full bg-navy-800 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 transition-all"
                            style={{ width: `${Math.round(progressPercentage)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-sm text-gold-400 mt-1">
                          <span>{completedLessons}/{totalLessons} aulas</span>
                          <span>{Math.round(progressPercentage)}%</span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-gold-200 font-medium mb-2">Por módulo</h3>
                        <div className="space-y-3">
                          {course.modules.map((m) => {
                            const mp = calculateModuleProgress(m)
                            const pct = mp.total > 0 ? Math.round((mp.completed / mp.total) * 100) : 0
                            return (
                              <div key={m.id} className="p-3 rounded-lg bg-navy-900/40 border border-gold-500/10">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-sm text-gold-200 font-medium truncate">{m.title}</p>
                                  <span className="text-xs text-gold-400">{mp.completed}/{mp.total} • {pct}%</span>
                                </div>
                                <div className="w-full bg-navy-800 rounded-full h-1.5">
                                  <div className="h-1.5 rounded-full bg-gold-600" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              },
              {
                id: 'avaliacoes',
                label: 'Avaliações',
                content: (
                  <Card>
                    <div className="space-y-4">
                      {loadingTests ? (
                        <div className="flex items-center justify-center py-8">
                          <Spinner />
                        </div>
                      ) : courseTests.length === 0 ? (
                        <div className="text-center py-8">
                          <FileText className="w-16 h-16 text-gold-400/30 mx-auto mb-4" />
                          <p className="text-gold-300">Ainda não há testes disponíveis para este curso.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {courseTests.map((test: any) => {
                            const hasGrade = test.grade && test.grade.best_score !== null
                            const isPassing = hasGrade && test.grade.best_score >= (test.passing_score || 70)
                            const attemptsLeft = (test.max_attempts || 3) - (test.grade?.total_attempts || 0)
                            const canRetake = !isPassing && attemptsLeft > 0

                            return (
                              <div
                                key={test.id}
                                className="p-4 rounded-lg bg-navy-900/40 border border-gold-500/10 hover:border-gold-500/30 transition-all"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <FileText className="w-5 h-5 text-gold-400" />
                                      <h4 className="text-gold-200 font-medium">{test.title}</h4>
                                    </div>

                                    {test.description && (
                                      <p className="text-gold-300/70 text-sm mb-3">{test.description}</p>
                                    )}

                                    <div className="flex flex-wrap gap-3 text-sm">
                                      {test.duration_minutes && (
                                        <div className="flex items-center gap-1 text-gold-400">
                                          <Clock className="w-4 h-4" />
                                          <span>{test.duration_minutes} min</span>
                                        </div>
                                      )}
                                      {test.question_count && (
                                        <div className="flex items-center gap-1 text-gold-400">
                                          <FileText className="w-4 h-4" />
                                          <span>{test.question_count} questões</span>
                                        </div>
                                      )}
                                      {test.passing_score && (
                                        <div className="flex items-center gap-1 text-gold-400">
                                          <Award className="w-4 h-4" />
                                          <span>Mínimo: {test.passing_score}%</span>
                                        </div>
                                      )}
                                    </div>

                                    {hasGrade && (
                                      <div className="mt-3 flex items-center gap-3">
                                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                          isPassing
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                          Melhor nota: {test.grade.best_score}%
                                        </div>
                                        <span className="text-gold-500/60 text-xs">
                                          {test.grade.total_attempts} {test.grade.total_attempts === 1 ? 'tentativa' : 'tentativas'}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    {!hasGrade ? (
                                      <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => router.push(`/student-dashboard/evaluations/${test.id}`)}
                                      >
                                        <Play className="w-4 h-4 mr-1" />
                                        Iniciar
                                      </Button>
                                    ) : (
                                      <>
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          onClick={() => router.push(`/student-dashboard/evaluations/${test.id}/results`)}
                                        >
                                          <Eye className="w-4 h-4 mr-1" />
                                          Ver Resultado
                                        </Button>
                                        {canRetake && (
                                          <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => router.push(`/student-dashboard/evaluations/${test.id}`)}
                                          >
                                            <BarChart3 className="w-4 h-4 mr-1" />
                                            Refazer ({attemptsLeft})
                                          </Button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </Card>
                )
              },
              {
                id: 'certificados',
                label: 'Certificados',
                content: (
                  <Card>
                    <div className="space-y-2">
                      <h3 className="text-gold-200 font-medium">Status de Certificação</h3>
                      <CertificatePanel />
                    </div>
                  </Card>
                )
              }
            ]}
          />
        </div>
      </div>
    </div>
  )
}

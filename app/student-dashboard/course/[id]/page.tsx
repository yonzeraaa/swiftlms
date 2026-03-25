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
  Eye,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Star,
  FileImage,
  Link,
  BarChart3
} from 'lucide-react'
import { Database } from '@/lib/database.types'
import { motion, AnimatePresence } from 'framer-motion'
import VideoPlayer from '../../components/VideoPlayer'
import DocumentViewer from '../../components/DocumentViewer'
import { getCoursePlayerData, markLessonComplete as markLessonCompleteAction, updateEnrollmentProgress } from '@/lib/actions/course-player'
import { ClassicRule, CornerBracket } from '../../../components/ui/RenaissanceSvgs'
import Spinner from '../../../components/ui/Spinner'

type Course = Database['public']['Tables']['courses']['Row']
type CourseModule = Database['public']['Tables']['course_modules']['Row']
type Subject = Database['public']['Tables']['subjects']['Row']
type Lesson = Database['public']['Tables']['lessons']['Row']
type LessonProgress = Database['public']['Tables']['lesson_progress']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

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

export default function CoursePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = params.id as string
  const lessonId = searchParams.get('lesson')

  const [course, setCourse] = useState<CourseWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<(Lesson & { progress?: LessonProgress }) | null>(null)
  const [totalLessons, setTotalLessons] = useState(0)
  const [completedLessons, setCompletedLessons] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const [courseTests, setCourseTests] = useState<any[]>([])
  const [loadingTests, setLoadingTests] = useState(true)
  const [eligibilityData, setEligibilityData] = useState<any>(null)
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const [requestingCertificate, setRequestingCertificate] = useState(false)
  const [activeTab, setActiveTab] = useState<'content' | 'progress' | 'evaluations' | 'certificates'>('content')

  useEffect(() => {
    if (courseId) {
      fetchCourseData()
      fetchCourseTests()
    }
  }, [courseId])

  useEffect(() => {
    if (course && course.modules.length > 0) {
      if (selectedLesson) {
        for (const module of course.modules) {
          for (const subject of module.subjects) {
            if (subject.lessons.some(l => l.id === selectedLesson.id)) {
              setExpandedModules(prev => new Set(prev).add(module.id))
              setExpandedSubjects(prev => new Set(prev).add(subject.id))
              return
            }
          }
        }
      } else {
        setExpandedModules(new Set([course.modules[0].id]))
        if (course.modules[0].subjects.length > 0) {
          setExpandedSubjects(new Set([course.modules[0].subjects[0].id]))
        }
      }
    }
  }, [selectedLesson, course])

  const fetchCourseData = async () => {
    try {
      const result = await getCoursePlayerData(courseId)
      if (!result || !result.success) {
        router.push('/student-dashboard/my-courses')
        return
      }

      const { course: courseData, isAdmin, enrollment: enrollmentData, enrollmentModules, modules: modulesData, progress: progressData, instructor: instructorInfo } = result

      setIsAdmin(isAdmin || false)
      let filteredModules = modulesData || []

      if (!isAdmin && enrollmentModules && enrollmentModules.length > 0) {
        const allowedModuleIds = enrollmentModules.map((em: any) => em.module_id).filter(Boolean)
        filteredModules = modulesData.filter((module: any) => allowedModuleIds.includes(module.id))
      }

      // Process modules with subjects and lessons with progress
      const modulesWithProgress: ModuleWithSubjects[] = []
      let totalCount = 0
      let completedCount = 0
      let firstIncomplete: Lesson | null = null

      // Ensure courseData exists before proceeding
      if (!courseData) {
        router.push('/student-dashboard/my-courses')
        return
      }

      for (const module of filteredModules) {
        const subjectsWithLessons: SubjectWithLessons[] = []
        const moduleSubjects = (module as any).module_subjects || []
        moduleSubjects.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))

        for (const moduleSubject of moduleSubjects) {
          if (moduleSubject.subject) {
            const subject = moduleSubject.subject
            const lessonsInSubject: (Lesson & { progress?: LessonProgress })[] = []
            if (subject.subject_lessons) {
              for (const sl of subject.subject_lessons) {
                if (sl.lesson) {
                  const lesson = sl.lesson
                  const progress = progressData?.find((p: any) => p.lesson_id === lesson.id)
                  if (progress?.is_completed) completedCount++
                  else if (!firstIncomplete) firstIncomplete = lesson
                  totalCount++
                  lessonsInSubject.push({ ...lesson, progress })
                }
              }
            }
            lessonsInSubject.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
            subjectsWithLessons.push({ ...subject, lessons: lessonsInSubject, order_index: moduleSubject.order_index || 0 })
          }
        }
        modulesWithProgress.push({ ...module, subjects: subjectsWithLessons })
      }

      setCourse({ 
        ...courseData, 
        modules: modulesWithProgress, 
        enrollment: enrollmentData || undefined, 
        instructor: instructorInfo || undefined 
      } as CourseWithDetails)
      setTotalLessons(totalCount)
      setCompletedLessons(completedCount)

      if (enrollmentData) {
        const resp = await fetch('/api/certificates/check-eligibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, enrollmentId: enrollmentData.id })
        })
        if (resp.ok) setEligibilityData(await resp.json())
      }

      if (lessonId) {
        const lesson = modulesWithProgress.flatMap(m => m.subjects).flatMap(s => s.lessons).find(l => l.id === lessonId)
        if (lesson) setSelectedLesson(lesson)
      } else if (firstIncomplete) {
        setSelectedLesson(firstIncomplete)
      } else if (modulesWithProgress.length > 0 && modulesWithProgress[0].subjects.length > 0 && modulesWithProgress[0].subjects[0].lessons.length > 0) {
        setSelectedLesson(modulesWithProgress[0].subjects[0].lessons[0])
      }
    } catch (err) {
      console.error(err)
      router.push('/student-dashboard/my-courses')
    } finally {
      setLoading(false)
    }
  }

  const fetchCourseTests = async () => {
    try {
      setLoadingTests(true)
      const resp = await fetch(`/api/student/tests?course_id=${courseId}`)
      if (resp.ok) {
        const result = await resp.json()
        setCourseTests(result.data.courseTests?.[0]?.tests || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingTests(false)
    }
  }

  const markLessonComplete = async (lid: string) => {
    if (!course?.enrollment) return
    try {
      const res = await markLessonCompleteAction(lid, course.enrollment.id)
      if (res.success) {
        const newCount = completedLessons + 1
        const pct = totalLessons > 0 ? Math.round((newCount / totalLessons) * 100) : 0
        await updateEnrollmentProgress(course.enrollment.id, pct)
        await fetchCourseData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const requestCertificate = async (type: 'technical' | 'lato-sensu') => {
    if (!course?.enrollment) return
    setRequestingCertificate(true)
    try {
      const resp = await fetch('/api/certificates/check-eligibility', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id, enrollmentId: course.enrollment.id, certificateType: type })
      })
      if (resp.ok) {
        setShowCertificateModal(false)
        await fetchCourseData()
        alert('Solicitação enviada com sucesso.')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setRequestingCertificate(false)
    }
  }

  if (loading) {
    return <Spinner fullPage size="xl" />
  }

  if (!course) return null

  const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  return (
    <div className="flex flex-col">
      {/* ── Header do Curso ── */}
      <div className="mb-12">
        <button
          onClick={() => router.push(isAdmin ? '/dashboard/lessons' : '/student-dashboard/my-courses')}
          style={{
            background: 'none',
            border: 'none',
            color: MUTED,
            fontFamily: 'var(--font-lora)',
            fontSize: '0.85rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            marginBottom: '1.5rem'
          }}
        >
          <ArrowLeft size={14} /> Voltar aos Registros
        </button>
        <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.5rem', fontWeight: 700, color: INK, marginBottom: '0.5rem' }}>
          {course.title}
        </h1>
        <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontStyle: 'italic', color: MUTED }}>
          {course.summary}
        </p>
        <div className="mt-6 flex items-center gap-6">
          <div className="flex flex-col">
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: MUTED, letterSpacing: '0.1em' }}>Progresso</span>
            <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.5rem', color: INK }}>{pct}%</span>
          </div>
          <div className="h-10 w-px bg-[#1e130c]/10" />
          <div className="flex flex-col">
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: MUTED, letterSpacing: '0.1em' }}>Concluídas</span>
            <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.5rem', color: INK }}>{completedLessons}/{totalLessons}</span>
          </div>
        </div>
        <div className="mt-8"><ClassicRule color={INK} /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* ── Sidebar: Sumário do Curso ── */}
        <div className="space-y-6">
          <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.25rem', color: INK, marginBottom: '1.5rem', borderLeft: `3px solid ${ACCENT}`, paddingLeft: '1rem' }}>
            Índice de Matérias
          </h2>
          <div className="space-y-4">
            {course.modules.map(mod => (
              <div key={mod.id} style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: '1rem' }}>
                <button
                  onClick={() => setExpandedModules(prev => {
                    const next = new Set(prev);
                    next.has(mod.id) ? next.delete(mod.id) : next.add(mod.id);
                    return next;
                  })}
                  className="w-full flex justify-between items-center text-left py-2"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-playfair)', color: INK, fontSize: '1.1rem', fontWeight: 600 }}
                >
                  <span className="flex-1 pr-4">{mod.title}</span>
                  {expandedModules.has(mod.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                <AnimatePresence>
                  {expandedModules.has(mod.id) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2 space-y-3">
                      {mod.subjects.map(sub => (
                        <div key={sub.id} className="pl-4">
                          <button
                            onClick={() => setExpandedSubjects(prev => {
                              const next = new Set(prev);
                              next.has(sub.id) ? next.delete(sub.id) : next.add(sub.id);
                              return next;
                            })}
                            className="w-full text-left py-1 text-sm flex justify-between items-center"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontStyle: 'italic' }}
                          >
                            <span>{sub.name}</span>
                            {expandedSubjects.has(sub.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <AnimatePresence>
                            {expandedSubjects.has(sub.id) && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-1 mt-1 pl-2 border-l border-[#1e130c]/10">
                                {sub.lessons.map(ls => (
                                  <button
                                    key={ls.id}
                                    onClick={() => setSelectedLesson(ls)}
                                    className="w-full text-left py-2 px-3 text-xs flex items-center gap-2 transition-colors"
                                    style={{
                                      background: selectedLesson?.id === ls.id ? 'rgba(30,19,12,0.04)' : 'none',
                                      border: 'none',
                                      color: selectedLesson?.id === ls.id ? ACCENT : INK,
                                      fontWeight: selectedLesson?.id === ls.id ? 700 : 400,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {ls.progress?.is_completed ? <CheckCircle2 size={12} style={{ color: INK }} /> : <div className="w-3 h-3 border border-[#1e130c]/30 rounded-full" />}
                                    <span className="flex-1 truncate">{ls.title}</span>
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* ── Área Principal: Player e Conteúdo ── */}
        <div className="lg:col-span-2">
          {/* Navegação de Abas Clássica */}
          <div className="flex gap-8 mb-8 border-b border-[#1e130c]/10">
            {[
              { id: 'content', label: 'Estudo' },
              { id: 'progress', label: 'Evolução' },
              { id: 'evaluations', label: 'Avaliações' },
              { id: 'certificates', label: 'Diplomas' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? `2px solid ${INK}` : '2px solid transparent',
                  padding: '0.75rem 0',
                  color: activeTab === tab.id ? INK : MUTED,
                  fontFamily: 'var(--font-lora)',
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="min-h-[500px]">
            {activeTab === 'content' && (
              selectedLesson ? (
                <div className="space-y-8">
                  <div className="flex justify-between items-start">
                    <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.75rem', color: INK }}>{selectedLesson.title}</h3>
                    {selectedLesson.progress?.is_completed && <span className="text-xs text-black opacity-60 font-bold uppercase tracking-widest bg-black/5 px-3 py-1">Registrada</span>}
                  </div>
                  
                  <div className="bg-[#1e130c]/[0.02] border border-[#1e130c]/10 p-4 relative">
                    <div className="absolute top-0 left-0 w-4 h-4 text-[#1e130c]/20"><CornerBracket size={16} /></div>
                    <div className="aspect-video w-full bg-black flex items-center justify-center">
                      {selectedLesson.content_type === 'video' ? (
                        selectedLesson.content_url ? <VideoPlayer url={selectedLesson.content_url} title={selectedLesson.title} /> : <p className="text-white italic">Rolo de filme não encontrado</p>
                      ) : (
                        <div className="bg-[#faf6ee] w-full h-full p-8 overflow-y-auto custom-scrollbar">
                          {selectedLesson.content_url ? <DocumentViewer url={selectedLesson.content_url} title={selectedLesson.title} /> : <div dangerouslySetInnerHTML={{ __html: selectedLesson.content || '' }} className="prose-classic" />}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-6">
                    <div className="flex items-center gap-2 text-sm italic text-[#7a6350]"><Clock size={16} /> {selectedLesson.duration_minutes || 0} minutos de instrução</div>
                    {!selectedLesson.progress?.is_completed && (
                      <button
                        onClick={() => markLessonComplete(selectedLesson.id)}
                        style={{ padding: '0.75rem 2rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                      >
                        Marcar Conclusão
                      </button>
                    )}
                  </div>
                </div>
              ) : <div className="text-center py-20 italic text-[#7a6350]">Abra o índice e selecione uma lição para iniciar o estudo.</div>
            )}

            {activeTab === 'progress' && (
              <div className="space-y-12">
                <div className="text-center">
                  <h4 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.25rem', color: INK, marginBottom: '2rem' }}>Resumo da Jornada</h4>
                  <div className="relative w-full h-1 bg-[#1e130c]/10 mb-4">
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: ACCENT, transition: 'width 1s ease' }} />
                  </div>
                  <p style={{ fontFamily: 'var(--font-lora)', fontStyle: 'italic', color: MUTED }}>{pct}% da trilha de conhecimento percorrida</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {course.modules.map(m => {
                    const lcount = m.subjects.reduce((a, s) => a + s.lessons.length, 0);
                    const ccount = m.subjects.reduce((a, s) => a + s.lessons.filter(l => l.progress?.is_completed).length, 0);
                    const mpct = lcount > 0 ? Math.round((ccount / lcount) * 100) : 0;
                    return (
                      <div key={m.id} style={{ padding: '1.5rem', border: `1px solid ${BORDER}` }}>
                        <h5 style={{ fontFamily: 'var(--font-playfair)', fontWeight: 600, color: INK, marginBottom: '0.5rem' }}>{m.title}</h5>
                        <p style={{ fontSize: '0.8rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>{ccount} de {lcount} aulas</p>
                        <div className="w-full h-px bg-[#1e130c]/10 relative"><div style={{ width: `${mpct}%`, height: '100%', backgroundColor: ACCENT, position: 'absolute', top: 0, left: 0 }} /></div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'evaluations' && (
              <div className="space-y-6">
                {courseTests.length === 0 ? (
                  <div className="text-center py-20 italic text-[#7a6350]">Nenhum exame formal agendado para este curso.</div>
                ) : (
                  courseTests.map(t => (
                    <div key={t.id} style={{ padding: '2rem', border: `1px solid ${BORDER}`, position: 'relative' }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.2rem', color: INK, marginBottom: '0.5rem' }}>{t.title}</h4>
                          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.9rem', color: MUTED, marginBottom: '1.5rem' }}>{t.description}</p>
                          <div className="flex gap-6 text-xs uppercase tracking-widest text-[#7a6350]">
                            <span>{t.question_count} Questões</span>
                            <span>Mínimo {t.passing_score}%</span>
                          </div>
                        </div>
                        <button
                          onClick={() => router.push(`/student-dashboard/evaluations/${t.id}`)}
                          style={{ padding: '0.75rem 1.5rem', border: `1px solid ${INK}`, color: INK, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600 }}
                        >
                          Iniciar Exame
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'certificates' && (
              <div className="space-y-8">
                <div style={{ padding: '2rem', border: `1px dashed ${BORDER}`, textAlign: 'center' }}>
                  <Award size={48} style={{ color: ACCENT, marginBottom: '1.5rem' }} />
                  <h4 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.5rem', color: INK, marginBottom: '1rem' }}>Elegibilidade de Diploma</h4>
                  
                  {eligibilityData?.eligibleCertificates?.technical || eligibilityData?.eligibleCertificates?.latoSensu ? (
                    <div className="space-y-6">
                      <p style={{ fontFamily: 'var(--font-lora)', fontStyle: 'italic', color: MUTED }}>Você atendeu aos critérios para emissão de certificado.</p>
                      <div className="flex justify-center gap-4">
                        {eligibilityData.eligibleCertificates.technical && (
                          <button onClick={() => requestCertificate('technical')} disabled={requestingCertificate} style={{ padding: '1rem 2rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600 }}>Solicitar Técnico</button>
                        )}
                        {eligibilityData.eligibleCertificates.latoSensu && (
                          <button onClick={() => requestCertificate('lato-sensu')} disabled={requestingCertificate} style={{ padding: '1rem 2rem', backgroundColor: ACCENT, color: PARCH, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600 }}>Solicitar Lato Sensu</button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p style={{ fontFamily: 'var(--font-lora)', fontStyle: 'italic', color: MUTED }}>Critérios ainda não atingidos para emissão.</p>
                      <div className="text-left max-w-sm mx-auto space-y-2 pt-4">
                        <div className="flex items-center justify-between text-xs"><span>Aulas Concluídas:</span> <span className={pct >= 100 ? 'text-black font-bold' : 'text-black/40 italic'}>{pct}%</span></div>
                        <div className="flex items-center justify-between text-xs"><span>Nota em Exame:</span> <span className={(eligibilityData?.bestTestScore || 0) >= 70 ? 'text-black font-bold' : 'text-black/40 italic'}>{eligibilityData?.bestTestScore || 0}%</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .prose-classic {
          font-family: var(--font-lora);
          line-height: 1.8;
          color: #1e130c;
        }
        .prose-classic p { margin-bottom: 1.5rem; }
        .prose-classic h1, .prose-classic h2, .prose-classic h3 { font-family: var(--font-playfair); margin: 2rem 0 1rem; }
      `}} />
    </div>
  )
}

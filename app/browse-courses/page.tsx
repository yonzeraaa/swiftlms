'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, BookOpen, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Playfair_Display, Lora } from 'next/font/google'
import { getBrowsableCourses } from '@/lib/actions/browse-enroll'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
  display: 'swap',
})

// ─── Design tokens (identical to login page) ──────────────────────────────────
const INK    = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED  = '#7a6350'
const BORDER = 'rgba(30,19,12,0.14)'

// ─── Ornamental components (identical to login page) ──────────────────────────

function SwiftMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 100" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M88,48 C78,37 57,25 14,27 C36,25 66,38 86,48 Z" />
      <path d="M88,48 C76,41 55,32 27,35 C46,32 68,41 86,48 Z" opacity="0.38" />
      <path d="M92,48 C102,37 123,25 166,27 C144,25 114,38 94,48 Z" />
      <path d="M92,48 C104,41 125,32 153,35 C134,32 112,41 94,48 Z" opacity="0.38" />
      <ellipse cx="90" cy="47" rx="6" ry="3.5" />
      <circle cx="90" cy="43" r="3" />
      <path d="M87,50 C84,59 79,69 73,75" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M93,50 C96,59 101,69 107,75" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function ClassicRule({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 300 14" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="0"   y1="7" x2="133" y2="7" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
      <line x1="167" y1="7" x2="300" y2="7" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
      <path d="M150,2 L155,7 L150,12 L145,7 Z" stroke="currentColor" strokeWidth="1.1" opacity="0.5" fill="none" />
      <circle cx="140" cy="7" r="1.3" fill="currentColor" opacity="0.32" />
      <circle cx="160" cy="7" r="1.3" fill="currentColor" opacity="0.32" />
    </svg>
  )
}

function CornerBracket({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 34" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2,22 L2,2 L22,2" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
    </svg>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SubjectWithDetails = {
  id: string
  name: string
  description?: string
  code?: string
  hours?: number
  order_index: number
}

type ModuleWithSubjects = {
  id: string
  title: string
  description?: string
  order_index: number
  course_id: string
  subjects: SubjectWithDetails[]
}

type CourseWithStructure = {
  id: string
  title: string
  description: string | null
  summary: string | null
  category: string
  difficulty: string
  duration_hours: number
  is_published: boolean | null
  modules: ModuleWithSubjects[]
}

// ─── CourseDescription ────────────────────────────────────────────────────────

function CourseDescription({
  courseId,
  description,
  isExpanded,
  onToggle,
}: {
  courseId: string
  description: string
  isExpanded: boolean
  onToggle: (id: string) => void
}) {
  const { truncated, isTruncated } = truncateDescription(description)
  const paragraphs = description.split(/\n\n+/).map(p => p.trim()).filter(Boolean)

  const textStyle: React.CSSProperties = {
    fontFamily: 'var(--font-lora)',
    color: MUTED,
    fontSize: '0.9rem',
    lineHeight: 1.75,
  }

  return (
    <div>
      {isExpanded ? (
        <div className="space-y-3">
          {paragraphs.map((paragraph, i) => (
            <p key={i} style={textStyle}>{paragraph}</p>
          ))}
        </div>
      ) : (
        <p style={textStyle}>{truncated}</p>
      )}
      {isTruncated && (
        <button
          onClick={() => onToggle(courseId)}
          className="mt-3 transition-colors duration-150 hover:underline"
          style={{ fontFamily: 'var(--font-lora)', color: ACCENT, fontSize: '0.82rem', fontStyle: 'italic' }}
        >
          {isExpanded ? 'Mostrar menos' : 'Mostrar mais'}
        </button>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Truncates text to the first paragraph or first 50 words, whichever is shorter.
// Returns { truncated, full, isTruncated }.
function truncateDescription(text: string) {
  const firstParagraph = text.split(/\n\n+/)[0].trim()
  const words = firstParagraph.split(/\s+/)
  const shortened = words.length > 50 ? words.slice(0, 50).join(' ') + '…' : firstParagraph

  const isTruncated = shortened !== text.trim()
  return { truncated: shortened, full: text.trim(), isTruncated }
}

export default function BrowseCoursesPage() {
  const [courses, setCourses]               = useState<CourseWithStructure[]>([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState<string | null>(null)
  const [expandedModules, setExpandedModules]       = useState<Set<string>>(new Set())
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())
  const router = useRouter()

  const toggleDescription = (courseId: string) => {
    setExpandedDescriptions(prev => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  useEffect(() => {
    fetchPublicCourses()
  }, [])

  const fetchPublicCourses = async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await getBrowsableCourses()
      const processedCourses: CourseWithStructure[] = []

      if (result.courses) {
        for (const course of result.courses) {
          const modules = (result.modules?.filter((m: any) => m.course_id === course.id) || [])
            .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))

          const modulesWithSubjects: ModuleWithSubjects[] = modules.map((module: any) => {
            const subjects = ((module.module_subjects || []) as any[])
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
              .filter((ms: any) => ms.subject)
              .map((ms: any) => ({
                id: ms.subject.id,
                name: ms.subject.name,
                description: ms.subject.description,
                code: ms.subject.code,
                hours: ms.subject.hours,
                order_index: ms.order_index || 0,
              }))

            return {
              id: module.id,
              title: module.title,
              description: module.description ?? undefined,
              order_index: module.order_index || 0,
              course_id: module.course_id,
              subjects,
            }
          })

          processedCourses.push({ ...course, modules: modulesWithSubjects })
        }
      }

      setCourses(processedCourses)

      if (processedCourses.length > 0) {
        const firstModuleIds = processedCourses.map(c => c.modules[0]?.id).filter(Boolean)
        setExpandedModules(new Set(firstModuleIds))
      }
    } catch (err) {
      console.error('Erro ao buscar cursos:', err)
      setError('Erro ao carregar os cursos. Tente novamente mais tarde.')
    } finally {
      setLoading(false)
    }
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
  }

  const difficultyLabel: Record<string, string> = {
    beginner: 'Iniciante',
    intermediate: 'Intermediário',
    advanced: 'Avançado',
  }

  const categoryLabel: Record<string, string> = {
    engineering: 'Engenharia',
    technology: 'Tecnologia',
    management: 'Gestão',
    science: 'Ciência',
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className={`min-h-screen w-full flex items-center justify-center ${playfair.variable} ${lora.variable}`}
        style={{ backgroundColor: '#f0e6d2' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 flex items-center justify-center"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <span
              className="inline-block w-5 h-5 border-2 rounded-full animate-spin"
              style={{ borderColor: `${ACCENT} transparent transparent transparent` }}
            />
          </div>
          <p
            style={{
              fontFamily: 'var(--font-lora)',
              color: MUTED,
              fontSize: '0.9rem',
              fontStyle: 'italic',
            }}
          >
            Carregando acervo...
          </p>
        </div>
      </div>
    )
  }

  // ─── Main render ─────────────────────────────────────────────────────────

  return (
    <div
      className={`min-h-screen w-full relative overflow-x-hidden ${playfair.variable} ${lora.variable}`}
      style={{ backgroundColor: '#f0e6d2' }}
    >
      {/* Linen texture */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' fill='%231e130c'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50"
        style={{
          backgroundColor: '#faf6ee',
          borderBottom: `1px solid ${BORDER}`,
          boxShadow: '0 1px 12px rgba(30,19,12,0.06)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-4 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div style={{ width: '2.2rem', color: ACCENT }}>
              <SwiftMark />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span
                  style={{
                    fontFamily: 'var(--font-playfair)',
                    color: INK,
                    fontSize: '1.25rem',
                    fontWeight: 700,
                  }}
                >
                  Swift
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-playfair)',
                    color: ACCENT,
                    fontSize: '1.1rem',
                    fontWeight: 400,
                    fontStyle: 'italic',
                  }}
                >
                  Edu.
                </span>
              </div>
              <p
                style={{
                  fontFamily: 'var(--font-lora)',
                  color: MUTED,
                  fontSize: '0.62rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  fontVariant: 'small-caps',
                }}
              >
                Catálogo Acadêmico
              </p>
            </div>
          </div>

          {/* Back button */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-4 py-2 transition-all duration-200"
            style={{
              fontFamily: 'var(--font-lora)',
              color: MUTED,
              fontSize: '0.85rem',
              fontStyle: 'italic',
              border: `1px solid ${BORDER}`,
              backgroundColor: 'transparent',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(30,19,12,0.04)'
              e.currentTarget.style.borderColor = 'rgba(30,19,12,0.28)'
              e.currentTarget.style.color = INK
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.borderColor = BORDER
              e.currentTarget.style.color = MUTED
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar</span>
          </button>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-6 sm:px-8 py-14">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <h1
            style={{
              fontFamily: 'var(--font-playfair)',
              color: INK,
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
            }}
          >
            Catálogo{' '}
            <span style={{ color: ACCENT, fontStyle: 'italic' }}>Acadêmico</span>
          </h1>

          <ClassicRule
            className="w-48 mx-auto my-5"
            style={{ color: INK } as React.CSSProperties}
          />

          <p
            style={{
              fontFamily: 'var(--font-lora)',
              color: MUTED,
              fontSize: '1.05rem',
              fontStyle: 'italic',
              lineHeight: 1.7,
              maxWidth: '36rem',
              margin: '0 auto',
            }}
          >
            Navegue por nossa seleção de cursos desenhados para a excelência.
          </p>
        </motion.div>

        {/* ── Error state ─────────────────────────────────────────────────── */}
        {error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-sm mx-auto text-center p-10"
            style={{ backgroundColor: '#faf6ee', border: `1px solid ${BORDER}` }}
          >
            <p
              style={{ fontFamily: 'var(--font-lora)', color: '#8b2525', fontSize: '0.95rem', fontStyle: 'italic', marginBottom: '1.2rem' }}
            >
              {error}
            </p>
            <button
              onClick={fetchPublicCourses}
              className="px-6 py-2.5 transition-all duration-200"
              style={{
                fontFamily: 'var(--font-lora)',
                color: '#faf6ee',
                fontSize: '0.88rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                backgroundColor: INK,
                border: `1px solid ${INK}`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#2c1c0e'
                e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(250,246,238,0.1)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = INK
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              Tentar novamente
            </button>
          </motion.div>
        ) : courses.length === 0 ? (

          // ── Empty state ────────────────────────────────────────────────────
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative max-w-lg mx-auto text-center px-10 py-14"
            style={{ backgroundColor: '#faf6ee', border: `1px solid ${BORDER}` }}
          >
            {/* Corner brackets on empty state card */}
            <div className="absolute top-0 left-0 w-8 h-8" style={{ color: ACCENT }}><CornerBracket /></div>
            <div className="absolute top-0 right-0 w-8 h-8" style={{ color: ACCENT, transform: 'scaleX(-1)' }}><CornerBracket /></div>
            <div className="absolute bottom-0 left-0 w-8 h-8" style={{ color: ACCENT, transform: 'scaleY(-1)' }}><CornerBracket /></div>
            <div className="absolute bottom-0 right-0 w-8 h-8" style={{ color: ACCENT, transform: 'scale(-1)' }}><CornerBracket /></div>

            <BookOpen className="w-10 h-10 mx-auto mb-5" style={{ color: `rgba(139,109,34,0.4)` }} />
            <h3
              style={{ fontFamily: 'var(--font-playfair)', color: INK, fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.6rem' }}
            >
              Acervo Vazio
            </h3>
            <p style={{ fontFamily: 'var(--font-lora)', color: MUTED, fontSize: '0.95rem', fontStyle: 'italic', lineHeight: 1.65 }}>
              No momento, não há cursos publicados. Nossos curadores estão preparando novos conteúdos.
            </p>
          </motion.div>
        ) : (

          // ── Course list ────────────────────────────────────────────────────
          <div className="space-y-10">
            {courses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
              >
                {/* Course card */}
                <div
                  className="relative px-8 sm:px-10 py-9"
                  style={{
                    backgroundColor: '#faf6ee',
                    border: `1px solid ${BORDER}`,
                    boxShadow: '0 2px 24px rgba(30,19,12,0.07)',
                  }}
                >
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-9 h-9" style={{ color: ACCENT }}><CornerBracket /></div>
                  <div className="absolute top-0 right-0 w-9 h-9" style={{ color: ACCENT, transform: 'scaleX(-1)' }}><CornerBracket /></div>
                  <div className="absolute bottom-0 left-0 w-9 h-9" style={{ color: ACCENT, transform: 'scaleY(-1)' }}><CornerBracket /></div>
                  <div className="absolute bottom-0 right-0 w-9 h-9" style={{ color: ACCENT, transform: 'scale(-1)' }}><CornerBracket /></div>

                  <div className="flex flex-col md:flex-row gap-8 md:gap-12">

                    {/* ── Course info ──────────────────────────────────────── */}
                    <div className="flex-1 min-w-0">

                      {/* Tags row */}
                      <div className="flex flex-wrap items-center gap-2.5 mb-5">
                        <span
                          className="px-3 py-1 text-[0.65rem] uppercase tracking-widest"
                          style={{
                            fontFamily: 'var(--font-lora)',
                            color: MUTED,
                            border: `1px solid ${BORDER}`,
                            letterSpacing: '0.12em',
                            fontVariant: 'small-caps',
                          }}
                        >
                          {categoryLabel[course.category] ?? course.category}
                        </span>
                        <span
                          className="px-3 py-1 text-[0.65rem] uppercase tracking-widest"
                          style={{
                            fontFamily: 'var(--font-lora)',
                            color: course.difficulty === 'beginner'
                              ? '#5a7a4a'
                              : course.difficulty === 'advanced'
                                ? '#8b2525'
                                : ACCENT,
                            border: `1px solid ${
                              course.difficulty === 'beginner'
                                ? 'rgba(90,122,74,0.3)'
                                : course.difficulty === 'advanced'
                                  ? 'rgba(139,37,37,0.3)'
                                  : 'rgba(139,109,34,0.3)'
                            }`,
                            letterSpacing: '0.12em',
                            fontVariant: 'small-caps',
                          }}
                        >
                          {difficultyLabel[course.difficulty] ?? course.difficulty}
                        </span>
                        <div
                          className="flex items-center gap-1.5 ml-auto md:ml-0"
                          style={{ fontFamily: 'var(--font-lora)', color: MUTED, fontSize: '0.78rem' }}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{course.duration_hours}h</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h2
                        style={{
                          fontFamily: 'var(--font-playfair)',
                          color: INK,
                          fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                          fontWeight: 600,
                          lineHeight: 1.2,
                          marginBottom: '1rem',
                        }}
                      >
                        {course.title}
                      </h2>

                      {/* Summary (block quote style) */}
                      {course.summary && (
                        <p
                          className="mb-4 pl-4"
                          style={{
                            fontFamily: 'var(--font-lora)',
                            color: MUTED,
                            fontSize: '1rem',
                            fontStyle: 'italic',
                            lineHeight: 1.7,
                            borderLeft: `2px solid rgba(139,109,34,0.25)`,
                          }}
                        >
                          &ldquo;{course.summary}&rdquo;
                        </p>
                      )}

                      {/* Description with truncation */}
                      {course.description && (
                        <CourseDescription
                          courseId={course.id}
                          description={course.description}
                          isExpanded={expandedDescriptions.has(course.id)}
                          onToggle={toggleDescription}
                        />
                      )}
                    </div>

                    {/* ── Module list ──────────────────────────────────────── */}
                    <div
                      className="w-full md:w-[280px] flex-shrink-0 border-t md:border-t-0 md:border-l pt-7 md:pt-0 md:pl-8"
                      style={{ borderColor: BORDER }}
                    >
                      <h4
                        className="flex items-center gap-2 mb-1"
                        style={{
                          fontFamily: 'var(--font-playfair)',
                          color: INK,
                          fontSize: '1rem',
                          fontWeight: 600,
                        }}
                      >
                        <BookOpen className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                        Estrutura Curricular
                      </h4>

                      <ClassicRule
                        className="w-full mb-4"
                        style={{ color: INK } as React.CSSProperties}
                      />

                      {course.modules.length === 0 && (
                        <p style={{ fontFamily: 'var(--font-lora)', color: 'rgba(122,99,80,0.6)', fontSize: '0.82rem', fontStyle: 'italic' }}>
                          Nenhum módulo cadastrado.
                        </p>
                      )}

                      <div className="space-y-1.5">
                        {course.modules.map((module, modIndex) => {
                          const isExpanded = expandedModules.has(module.id)
                          return (
                            <div
                              key={module.id}
                              style={{
                                border: `1px solid ${BORDER}`,
                                backgroundColor: isExpanded ? 'rgba(139,109,34,0.04)' : 'transparent',
                                transition: 'background-color 0.2s',
                              }}
                            >
                              <button
                                onClick={() => toggleModule(module.id)}
                                className="w-full flex items-center justify-between p-3 text-left"
                              >
                                <div>
                                  <span
                                    className="block mb-0.5"
                                    style={{
                                      fontFamily: 'var(--font-lora)',
                                      color: ACCENT,
                                      fontSize: '0.6rem',
                                      letterSpacing: '0.14em',
                                      textTransform: 'uppercase',
                                      fontVariant: 'small-caps',
                                    }}
                                  >
                                    Módulo {String(modIndex + 1).padStart(2, '0')}
                                  </span>
                                  <span
                                    style={{
                                      fontFamily: 'var(--font-lora)',
                                      color: MUTED,
                                      fontSize: '0.83rem',
                                    }}
                                  >
                                    {module.title}
                                  </span>
                                </div>
                                {isExpanded
                                  ? <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: ACCENT }} />
                                  : <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MUTED }} />
                                }
                              </button>

                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.18 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-3 pb-3 space-y-1.5">
                                      {module.subjects.map((subject, subIndex) => (
                                        <div
                                          key={subject.id}
                                          className="flex items-start gap-3 pl-2 py-1"
                                          style={{ borderLeft: `1px solid ${BORDER}` }}
                                        >
                                          <span
                                            className="text-[0.65rem] mt-0.5 font-mono flex-shrink-0"
                                            style={{ color: 'rgba(30,19,12,0.3)' }}
                                          >
                                            {String(subIndex + 1).padStart(2, '0')}
                                          </span>
                                          <span style={{ fontFamily: 'var(--font-lora)', color: MUTED, fontSize: '0.78rem', lineHeight: 1.5 }}>
                                            {subject.name}
                                          </span>
                                        </div>
                                      ))}
                                      {module.subjects.length === 0 && (
                                        <p
                                          className="pl-2"
                                          style={{ fontFamily: 'var(--font-lora)', color: 'rgba(122,99,80,0.6)', fontSize: '0.78rem', fontStyle: 'italic' }}
                                        >
                                          Nenhuma disciplina cadastrada.
                                        </p>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

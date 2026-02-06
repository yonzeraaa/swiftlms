'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { ArrowLeft, BookOpen, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Playfair_Display, Inter } from 'next/font/google'
import { getBrowsableCourses } from '@/lib/actions/browse-enroll'
import Button from '../components/Button'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

function OrnamentalDivider({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 20" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="10" x2="120" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <line x1="180" y1="10" x2="300" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <path
        d="M130 10 C135 5 140 3 150 3 C160 3 165 5 170 10 C165 15 160 17 150 17 C140 17 135 15 130 10Z"
        stroke="currentColor" strokeWidth="0.8" opacity="0.5" fill="currentColor" fillOpacity="0.1"
      />
      <circle cx="150" cy="10" r="2" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

function CornerFlourish({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 5 C5 5 15 5 25 15 C35 25 30 40 20 35 C10 30 15 20 25 15" stroke="currentColor" strokeWidth="1" opacity="0.5" fill="none" />
      <path d="M5 5 C5 5 5 15 15 25 C25 35 40 30 35 20 C30 10 20 15 15 25" stroke="currentColor" strokeWidth="1" opacity="0.5" fill="none" />
      <circle cx="5" cy="5" r="2" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

type Course = {
  id: string
  title: string
  description: string | null
  summary: string | null
  category: string
  difficulty: string
  duration_hours: number
  is_published: boolean | null
}

type Subject = {
  id: string
  name: string
  description?: string
  code?: string
  hours?: number
}

type SubjectWithDetails = Subject & {
  order_index: number
}

type CourseModule = {
  id: string
  title: string
  description?: string
  order_index: number
  course_id: string
}

type ModuleWithSubjects = CourseModule & {
  subjects: SubjectWithDetails[]
}

type CourseWithStructure = Course & {
  modules: ModuleWithSubjects[]
}

export default function BrowseCoursesPage() {
  const [courses, setCourses] = useState<CourseWithStructure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const router = useRouter()

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
          const modulesWithSubjects: ModuleWithSubjects[] = []

          const modules = result.modules?.filter((m: any) => m.course_id === course.id) || []
          modules.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))

          for (const module of modules) {
            const subjectsWithDetails: SubjectWithDetails[] = []

            const moduleSubjects = (module as any).module_subjects || []
            moduleSubjects.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))

            for (const moduleSubject of moduleSubjects) {
              if (moduleSubject.subject) {
                subjectsWithDetails.push({
                  id: moduleSubject.subject.id,
                  name: moduleSubject.subject.name || moduleSubject.subject.title,
                  description: moduleSubject.subject.description,
                  code: moduleSubject.subject.code,
                  hours: moduleSubject.subject.hours,
                  order_index: moduleSubject.order_index || 0
                })
              }
            }

            modulesWithSubjects.push({
              id: module.id,
              title: module.title,
              description: module.description ?? undefined,
              order_index: module.order_index || 0,
              course_id: module.course_id,
              subjects: subjectsWithDetails
            })
          }

          processedCourses.push({
            ...course,
            modules: modulesWithSubjects
          })
        }
      }

      setCourses(processedCourses)

      if (processedCourses.length > 0) {
        const firstModules = processedCourses
          .map(course => course.modules[0]?.id)
          .filter(Boolean)
        setExpandedModules(new Set(firstModules))
      }

    } catch (err) {
      console.error('Erro ao buscar cursos:', err)
      setError('Erro ao carregar os cursos. Tente novamente mais tarde.')
    } finally {
      setLoading(false)
    }
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

  const getDifficultyLabel = (difficulty: string) => {
    const config = {
      beginner: 'Iniciante',
      intermediate: 'Intermediário',
      advanced: 'Avançado'
    }
    return config[difficulty as keyof typeof config] || difficulty
  }

  const getCategoryLabel = (category: string) => {
    const categories = {
      engineering: 'Engenharia',
      technology: 'Tecnologia',
      management: 'Gestão',
      science: 'Ciência'
    }
    return categories[category as keyof typeof categories] || category
  }

  if (loading) {
    return (
      <div className={`min-h-screen w-full flex items-center justify-center relative overflow-hidden ${inter.className}`}
        style={{ background: 'linear-gradient(145deg, #0a0806 0%, #1a1410 40%, #0f0b08 100%)' }}
      >
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 flex items-center justify-center mb-4"
            style={{ border: '1px solid rgba(201,168,76,0.3)' }}
          >
            <div className="w-10 h-10 border border-[#c9a84c]/20 border-t-[#c9a84c] rounded-full animate-spin" />
          </div>
          <p className={`${playfair.className} italic font-light`} style={{ color: '#c9a84c' }}>
            Carregando acervo...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen w-full relative overflow-x-hidden ${inter.className}`}
      style={{ background: 'linear-gradient(145deg, #0a0806 0%, #1a1410 40%, #0f0b08 100%)' }}
    >
      {/* Textura de fundo sutil */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 50%, rgba(139,115,85,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, rgba(107,29,29,0.04) 0%, transparent 50%)'
        }}
      />

      {/* Moldura decorativa na borda da viewport */}
      <div className="fixed inset-3 border pointer-events-none z-20" style={{ borderColor: 'rgba(201,168,76,0.08)' }} />

      {/* Ornamentos de canto */}
      <CornerFlourish className="fixed top-4 left-4 w-12 h-12 text-[#c9a84c] opacity-40 pointer-events-none z-20" />
      <CornerFlourish className="fixed top-4 right-4 w-12 h-12 text-[#c9a84c] opacity-40 pointer-events-none z-20 -scale-x-100" />
      <CornerFlourish className="fixed bottom-4 left-4 w-12 h-12 text-[#c9a84c] opacity-40 pointer-events-none z-20 -scale-y-100" />
      <CornerFlourish className="fixed bottom-4 right-4 w-12 h-12 text-[#c9a84c] opacity-40 pointer-events-none z-20 -scale-x-100 -scale-y-100" />

      {/* Textura de pergaminho */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(201,168,76,0.15) 28px, rgba(201,168,76,0.15) 29px)' }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b"
        style={{
          background: 'linear-gradient(170deg, rgba(26,20,16,0.95) 0%, rgba(21,17,12,0.95) 100%)',
          borderBottomColor: 'rgba(201,168,76,0.12)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`${playfair.className} text-xl font-medium`} style={{ color: '#e8dcc8' }}>
                Swift<span style={{ color: '#c9a84c' }}>EDU</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: '#8b7355', fontVariant: 'small-caps' }}>
                Catálogo Acadêmico
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className={`${playfair.className} flex items-center gap-2 py-2 px-4 text-xs italic font-light transition-all duration-300 hover:text-[#c9a84c]`}
              style={{
                color: '#8b7355',
                border: '1px solid rgba(139,115,85,0.25)',
                letterSpacing: '0.1em',
              }}
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Voltar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-3 mb-4 px-5 py-1.5 border"
            style={{
              borderColor: 'rgba(201,168,76,0.2)',
              background: 'radial-gradient(ellipse at center, rgba(107,29,29,0.2) 0%, rgba(107,29,29,0.05) 70%, transparent 100%)',
              borderRadius: '50px',
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#c9a84c]" style={{ boxShadow: '0 0 6px rgba(201,168,76,0.4)' }} />
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: '#c9a84c', fontVariant: 'small-caps' }}>
              Acervo Disponível
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#c9a84c]" style={{ boxShadow: '0 0 6px rgba(201,168,76,0.4)' }} />
          </div>

          <h2 className={`${playfair.className} text-4xl md:text-5xl font-medium mb-4`} style={{ color: '#e8dcc8' }}>
            Explore o{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c9a84c] to-[#d4b85a]">
              Conhecimento
            </span>
          </h2>

          <OrnamentalDivider className="w-64 mx-auto text-[#c9a84c] mb-4" />

          <p className="max-w-2xl mx-auto font-light leading-relaxed" style={{ color: '#8b7355' }}>
            Navegue por nossa seleção de cursos desenhados para a excelência.
            Cada módulo é uma nova página na sua jornada de aprendizado.
          </p>
        </motion.div>

        {error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-md mx-auto text-center p-8"
            style={{
              border: '1px solid rgba(107,29,29,0.3)',
              background: 'linear-gradient(170deg, #1a1410 0%, #15110c 50%, #1a1410 100%)',
            }}
          >
            <h3 className={`${playfair.className} text-xl italic mb-2`} style={{ color: '#c75050' }}>
              Indisponibilidade Temporária
            </h3>
            <p className="font-light mb-6" style={{ color: '#8b7355' }}>{error}</p>
            <button
              onClick={fetchPublicCourses}
              className={`${playfair.className} py-2.5 px-6 text-sm italic font-light transition-all duration-500 hover:bg-[#c9a84c] hover:text-[#0a0806] group`}
              style={{
                color: '#c9a84c',
                border: '1px solid rgba(201,168,76,0.5)',
              }}
            >
              Tentar Novamente
            </button>
          </motion.div>
        ) : courses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-lg mx-auto text-center p-12 relative"
            style={{
              background: 'linear-gradient(170deg, #1a1410 0%, #15110c 50%, #1a1410 100%)',
              border: '1px solid rgba(201,168,76,0.15)',
            }}
          >
            <div className="absolute inset-3 pointer-events-none" style={{ border: '1px solid rgba(201,168,76,0.07)' }} />
            <BookOpen className="w-12 h-12 mx-auto mb-6" style={{ color: 'rgba(201,168,76,0.4)' }} />
            <h3 className={`${playfair.className} text-2xl italic font-medium mb-3`} style={{ color: '#e8dcc8' }}>
              O Acervo está Vazio
            </h3>
            <p className="font-light" style={{ color: '#8b7355' }}>
              No momento, não há cursos publicados. Nossos curadores estão trabalhando em novos conteúdos.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-12">
            {courses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="group"
              >
                {/* Course Card */}
                <div className="relative p-8 md:p-10 shadow-2xl transition-all duration-500"
                  style={{
                    background: 'linear-gradient(170deg, #1a1410 0%, #15110c 50%, #1a1410 100%)',
                    border: '1px solid rgba(201,168,76,0.12)',
                  }}
                >
                  {/* Moldura interna */}
                  <div className="absolute inset-3 pointer-events-none" style={{ border: '1px solid rgba(201,168,76,0.06)' }} />

                  {/* Textura de pergaminho */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                    style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(201,168,76,0.15) 28px, rgba(201,168,76,0.15) 29px)' }}
                  />

                  {/* Flourishes nos cantos */}
                  <CornerFlourish className="absolute top-1 left-1 w-8 h-8 text-[#c9a84c] opacity-20" />
                  <CornerFlourish className="absolute top-1 right-1 w-8 h-8 text-[#c9a84c] opacity-20 -scale-x-100" />
                  <CornerFlourish className="absolute bottom-1 left-1 w-8 h-8 text-[#c9a84c] opacity-20 -scale-y-100" />
                  <CornerFlourish className="absolute bottom-1 right-1 w-8 h-8 text-[#c9a84c] opacity-20 -scale-x-100 -scale-y-100" />

                  <div className="relative z-10 flex flex-col md:flex-row gap-8 md:gap-12">
                    {/* Course Info */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-6">
                        <span className="px-3 py-1 text-[10px] uppercase tracking-widest font-bold"
                          style={{ border: '1px solid rgba(201,168,76,0.25)', color: '#c9a84c', fontVariant: 'small-caps' }}
                        >
                          {getCategoryLabel(course.category)}
                        </span>
                        <span className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold ${
                          course.difficulty === 'beginner'
                            ? 'text-[#7a9a6b] border-[#7a9a6b]/25'
                            : course.difficulty === 'intermediate'
                              ? 'text-[#c9a84c] border-[#c9a84c]/25'
                              : 'text-[#c75050] border-[#c75050]/25'
                        }`}
                          style={{ border: '1px solid', fontVariant: 'small-caps' }}
                        >
                          {getDifficultyLabel(course.difficulty)}
                        </span>
                        <div className="flex items-center gap-2 text-xs uppercase tracking-widest ml-auto md:ml-0"
                          style={{ color: '#6b5d4a' }}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{course.duration_hours}h Duração</span>
                        </div>
                      </div>

                      <h3 className={`${playfair.className} text-3xl font-medium mb-4 group-hover:text-[#c9a84c] transition-colors duration-300`}
                        style={{ color: '#e8dcc8' }}
                      >
                        {course.title}
                      </h3>

                      {course.summary && (
                        <p className={`${playfair.className} text-lg italic mb-6 font-light leading-relaxed pl-4`}
                          style={{ color: 'rgba(232,220,200,0.7)', borderLeft: '2px solid rgba(201,168,76,0.25)' }}
                        >
                          &ldquo;{course.summary}&rdquo;
                        </p>
                      )}

                      {course.description && (
                        <p className="leading-relaxed font-light mb-8 text-sm" style={{ color: '#8b7355' }}>
                          {course.description}
                        </p>
                      )}
                    </div>

                    {/* Modules List */}
                    <div className="w-full md:w-1/3 border-t md:border-t-0 md:border-l pt-8 md:pt-0 md:pl-8"
                      style={{ borderColor: 'rgba(201,168,76,0.1)' }}
                    >
                      <h4 className={`${playfair.className} text-lg mb-1 flex items-center gap-3 font-medium`}
                        style={{ color: '#e8dcc8' }}
                      >
                        <BookOpen className="w-4 h-4" style={{ color: '#c9a84c' }} />
                        Estrutura Curricular
                      </h4>
                      <OrnamentalDivider className="w-full text-[#c9a84c] opacity-40 mb-4" />

                      <div className="space-y-2">
                        {course.modules.map((module, modIndex) => {
                          const isExpanded = expandedModules.has(module.id)
                          return (
                            <div key={module.id}
                              className="transition-colors"
                              style={{
                                border: '1px solid rgba(201,168,76,0.06)',
                                background: isExpanded ? 'rgba(201,168,76,0.03)' : 'transparent',
                              }}
                            >
                              <button
                                onClick={() => toggleModuleExpansion(module.id)}
                                className="w-full flex items-center justify-between p-3 text-left group/module"
                              >
                                <div>
                                  <span className="text-[10px] uppercase tracking-widest block mb-1 font-bold"
                                    style={{ color: '#c9a84c', fontVariant: 'small-caps' }}
                                  >
                                    Módulo {String(modIndex + 1).padStart(2, '0')}
                                  </span>
                                  <span className="text-sm font-light group-hover/module:text-[#e8dcc8] transition-colors"
                                    style={{ color: '#8b7355' }}
                                  >
                                    {module.title}
                                  </span>
                                </div>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" style={{ color: '#c9a84c' }} />
                                ) : (
                                  <ChevronDown className="w-4 h-4 group-hover/module:text-[#c9a84c] transition-colors" style={{ color: '#6b5d4a' }} />
                                )}
                              </button>

                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-3 pb-3 pt-0 space-y-1.5">
                                      {module.subjects.map((subject, subIndex) => (
                                        <div key={subject.id} className="flex items-start gap-3 pl-2 py-1"
                                          style={{ borderLeft: '1px solid rgba(201,168,76,0.1)' }}
                                        >
                                          <span className="text-[10px] mt-0.5 font-mono" style={{ color: '#6b5d4a' }}>
                                            {String(subIndex + 1).padStart(2, '0')}
                                          </span>
                                          <span className="text-xs font-light" style={{ color: '#8b7355' }}>
                                            {subject.name}
                                          </span>
                                        </div>
                                      ))}
                                      {module.subjects.length === 0 && (
                                        <p className={`${playfair.className} text-xs italic pl-2`} style={{ color: '#6b5d4a' }}>
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

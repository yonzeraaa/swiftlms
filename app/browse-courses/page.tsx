'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { ArrowLeft, BookOpen, Clock, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Playfair_Display, Inter } from 'next/font/google'
import { getBrowsableCourses } from '@/lib/actions/browse-enroll'
import Logo from '../components/Logo'
import Button from '../components/Button'

// Fonts
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
      <div className={`min-h-screen w-full flex items-center justify-center bg-[#0F1115] relative overflow-hidden ${inter.className}`}>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F1115] via-[#1A1D23] to-[#0F1115] opacity-95" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mb-4" />
          <p className={`${playfair.className} text-[#D4AF37] text-xl italic`}>Carregando acervo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen w-full bg-[#0F1115] relative overflow-x-hidden ${inter.className}`}>

      {/* Background */}
      <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-br from-[#0F1115] via-[#1A1D23] to-[#0F1115] opacity-95" />

      {/* Decorative Circles */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        className="fixed top-[-20%] right-[-10%] w-[800px] h-[800px] border border-[#D4AF37]/5 rounded-full pointer-events-none"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
        className="fixed bottom-[-20%] left-[-10%] w-[1000px] h-[1000px] border border-[#D4AF37]/5 rounded-full pointer-events-none"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0F1115]/80 backdrop-blur-md border-b border-[#D4AF37]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <h1 className={`${playfair.className} text-xl text-white tracking-wide`}>
                  Swift<span className="text-[#D4AF37]">EDU</span>
                </h1>
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em]">Catálogo Acadêmico</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="!border-[#D4AF37]/30 !text-[#D4AF37] hover:!bg-[#D4AF37] hover:!text-[#0F1115] !rounded-sm !text-xs !uppercase !tracking-widest transition-all"
            >
              <div className="flex items-center gap-2">
                <ArrowLeft className="w-3 h-3" />
                <span>Voltar</span>
              </div>
            </Button>
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
          <div className="inline-flex items-center gap-3 mb-4 px-4 py-1.5 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/5">
            <span className="text-[#D4AF37] text-[10px] uppercase tracking-[0.2em] font-medium">Acervo Disponível</span>
          </div>
          <h2 className={`${playfair.className} text-4xl md:text-5xl text-white mb-6`}>
            Explore o <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F4D03F]">Conhecimento</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
            Navegue por nossa seleção de cursos desenhados para a excelência.
            Cada módulo é uma nova página na sua jornada de aprendizado.
          </p>
        </motion.div>

        {error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-md mx-auto text-center p-8 border border-red-900/30 bg-red-900/5 rounded-sm"
          >
            <h3 className={`${playfair.className} text-xl text-red-400 mb-2`}>Indisponibilidade Temporária</h3>
            <p className="text-gray-400 mb-6 font-light">{error}</p>
            <Button
              onClick={fetchPublicCourses}
              className="!bg-[#D4AF37] !text-[#0F1115] hover:!bg-[#E5C150] !rounded-sm !uppercase !tracking-widest !text-xs !font-bold"
            >
              Tentar Novamente
            </Button>
          </motion.div>
        ) : courses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-lg mx-auto text-center p-12 border border-[#D4AF37]/10 bg-[#14161B] rounded-sm"
          >
            <BookOpen className="w-12 h-12 text-[#D4AF37]/40 mx-auto mb-6" />
            <h3 className={`${playfair.className} text-2xl text-white mb-3`}>O Acervo está Vazio</h3>
            <p className="text-gray-400 font-light">
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
                <div className="relative bg-[#14161B] border border-[#D4AF37]/10 p-8 md:p-10 shadow-2xl transition-all duration-500 hover:border-[#D4AF37]/30">
                  {/* Decorative corner */}
                  <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-2 bg-[#D4AF37]/20" />
                    <div className="absolute top-0 right-0 w-16 h-[1px] bg-gradient-to-l from-[#D4AF37]/20 to-transparent" />
                    <div className="absolute top-0 right-0 h-16 w-[1px] bg-gradient-to-b from-[#D4AF37]/20 to-transparent" />
                  </div>

                  <div className="flex flex-col md:flex-row gap-8 md:gap-12">
                    {/* Course Info */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-6">
                        <span className="px-3 py-1 border border-[#D4AF37]/20 text-[#D4AF37] text-[10px] uppercase tracking-widest font-medium">
                          {getCategoryLabel(course.category)}
                        </span>
                        <span className={`px-3 py-1 border text-[10px] uppercase tracking-widest font-medium ${course.difficulty === 'beginner' ? 'border-green-900/30 text-green-400' :
                          course.difficulty === 'intermediate' ? 'border-yellow-900/30 text-yellow-400' :
                            'border-red-900/30 text-red-400'
                          }`}>
                          {getDifficultyLabel(course.difficulty)}
                        </span>
                        <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-widest ml-auto md:ml-0">
                          <Clock className="w-3 h-3" />
                          <span>{course.duration_hours}h Duração</span>
                        </div>
                      </div>

                      <h3 className={`${playfair.className} text-3xl text-white mb-4 group-hover:text-[#D4AF37] transition-colors duration-300`}>
                        {course.title}
                      </h3>

                      {course.summary && (
                        <p className="text-lg text-gray-300 mb-6 font-light leading-relaxed italic border-l-2 border-[#D4AF37]/20 pl-4">
                          "{course.summary}"
                        </p>
                      )}

                      {course.description && (
                        <p className="text-gray-400 leading-relaxed font-light mb-8 text-sm">
                          {course.description}
                        </p>
                      )}
                    </div>

                    {/* Modules List (Visual Representation) */}
                    <div className="w-full md:w-1/3 border-t md:border-t-0 md:border-l border-[#D4AF37]/10 pt-8 md:pt-0 md:pl-8">
                      <h4 className={`${playfair.className} text-white text-lg mb-6 flex items-center gap-3`}>
                        <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                        Estrutura Curricular
                      </h4>

                      <div className="space-y-3">
                        {course.modules.map((module, modIndex) => {
                          const isExpanded = expandedModules.has(module.id)
                          return (
                            <div key={module.id} className="border border-[#D4AF37]/5 bg-[#0F1115]/50 hover:bg-[#0F1115] transition-colors">
                              <button
                                onClick={() => toggleModuleExpansion(module.id)}
                                className="w-full flex items-center justify-between p-4 text-left group/module"
                              >
                                <div>
                                  <span className="text-[#D4AF37] text-[10px] uppercase tracking-widest block mb-1">
                                    Módulo {String(modIndex + 1).padStart(2, '0')}
                                  </span>
                                  <span className="text-gray-300 text-sm font-medium group-hover/module:text-white transition-colors">
                                    {module.title}
                                  </span>
                                </div>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-[#D4AF37]" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-600 group-hover/module:text-[#D4AF37] transition-colors" />
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
                                    <div className="px-4 pb-4 pt-0 space-y-2">
                                      {module.subjects.map((subject, subIndex) => (
                                        <div key={subject.id} className="flex items-start gap-3 pl-2 border-l border-[#D4AF37]/10 py-1">
                                          <span className="text-gray-600 text-[10px] mt-0.5 font-mono">
                                            {String(subIndex + 1).padStart(2, '0')}
                                          </span>
                                          <span className="text-gray-400 text-xs font-light">
                                            {subject.name}
                                          </span>
                                        </div>
                                      ))}
                                      {module.subjects.length === 0 && (
                                        <p className="text-gray-600 text-xs italic pl-2">Nenhuma disciplina cadastrada.</p>
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
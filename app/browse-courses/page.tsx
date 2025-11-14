'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { ArrowLeft, BookOpen, Clock, Users, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getBrowsableCourses } from '@/lib/actions/browse-enroll'
import Logo from '../components/Logo'
import Button from '../components/Button'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Spinner from '../components/ui/Spinner'

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

  const getDifficultyBadge = (difficulty: string) => {
    const difficultyConfig = {
      beginner: { label: 'Iniciante', variant: 'success' as const },
      intermediate: { label: 'Intermediário', variant: 'warning' as const },
      advanced: { label: 'Avançado', variant: 'error' as const }
    }
    return difficultyConfig[difficulty as keyof typeof difficultyConfig] || 
           { label: difficulty, variant: 'default' as const }
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
      <div className="min-h-screen bg-pattern relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-600/50 via-navy-700/50 to-navy-900/50" />
        <div className="relative min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Spinner size="lg" className="mb-4" />
            <p className="text-gold-200 text-lg">Carregando cursos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-pattern relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-600/50 via-navy-700/50 to-navy-900/50" />
        <div className="relative min-h-screen flex items-center justify-center px-4">
          <Card className="max-w-md w-full text-center">
            <h2 className="text-xl font-bold text-red-400 mb-4">Erro</h2>
            <p className="text-gold-300 mb-6">{error}</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                icon={<ArrowLeft className="w-4 h-4 flex-shrink-0" />}
              >
                Voltar ao Login
              </Button>
              <Button
                variant="primary"
                onClick={fetchPublicCourses}
              >
                Tentar Novamente
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pattern relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-600/50 via-navy-700/50 to-navy-900/50" />
      
      <div className="relative min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-navy-900/90 backdrop-blur-md border-b border-gold-500/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Logo width={120} height={40} />
                <div>
                  <h1 className="text-xl font-bold text-gold-200">Cursos Disponíveis</h1>
                  <p className="text-sm text-gold-300/70">Explore nossa ementa completa</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                icon={<ArrowLeft className="w-4 h-4 flex-shrink-0" />}
              >
                Voltar ao Login
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {courses.length === 0 ? (
            <Card className="py-12">
              <BookOpen className="w-16 h-16 text-gold-400 mx-auto mb-4 flex-shrink-0" />
              <h2 className="text-2xl font-bold text-gold-200 mb-2 text-left">Nenhum curso disponível</h2>
              <p className="text-gold-300 text-left">
                Não há cursos publicados no momento. Volte em breve para conferir novidades!
              </p>
            </Card>
          ) : (
            <div className="space-y-8">
              {courses.map((course) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Course Header */}
                  <Card variant="elevated" className="mb-6">
                    <div className="mb-6">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <Badge variant={getDifficultyBadge(course.difficulty).variant}>
                          {getDifficultyBadge(course.difficulty).label}
                        </Badge>
                        <Badge variant="default">
                          {getCategoryLabel(course.category)}
                        </Badge>
                        <div className="flex items-center gap-1 text-gold-300">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">{course.duration_hours}h</span>
                        </div>
                      </div>
                      
                      <h2 className="text-2xl font-bold text-gold mb-3">
                        {course.title}
                      </h2>
                      
                      {course.summary && (
                        <p className="text-gold-300 text-lg mb-4 leading-relaxed">
                          {course.summary}
                        </p>
                      )}
                      
                      {course.description && (
                        <div className="prose prose-gold max-w-none">
                          <p className="text-gold-200/90 leading-relaxed whitespace-pre-line">
                            {course.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Course Structure */}
                  <div className="grid gap-4">
                    <h3 className="text-xl font-semibold text-gold-200 mb-4">
                      Estrutura do Curso ({course.modules.length} módulos)
                    </h3>
                    
                    {course.modules.map((module, moduleIndex) => {
                      const isExpanded = expandedModules.has(module.id)
                      const subjectCount = module.subjects.length
                      
                      return (
                        <Card key={module.id} variant="glass">
                          {/* Module Header */}
                          <motion.button
                            onClick={() => toggleModuleExpansion(module.id)}
                            className="w-full text-left flex items-center justify-between gap-3 p-3 -m-3 rounded-lg transition-all hover:bg-navy-800/30"
                            whileHover={{ scale: 1.005 }}
                            whileTap={{ scale: 0.995 }}
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gold-200 mb-1">
                                Módulo {moduleIndex + 1}: {module.title}
                              </h4>
                              <div className="text-sm text-gold-300/60">
                                {subjectCount} disciplina{subjectCount !== 1 ? 's' : ''}
                              </div>
                              {module.description && (
                                <p className="text-sm text-gold-300/80 mt-2">
                                  {module.description}
                                </p>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gold-400 flex-shrink-0" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gold-400 flex-shrink-0" />
                              )}
                            </div>
                          </motion.button>

                          {/* Module Subjects */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className="space-y-3 pt-4 border-t border-gold-500/20 mt-4">
                                  {module.subjects.map((subject, subjectIndex) => (
                                    <div
                                      key={subject.id}
                                      className="flex items-start gap-4 p-3 rounded-lg bg-navy-900/30 border border-gold-500/10"
                                    >
                                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center">
                                        <span className="text-sm font-medium text-gold-200">
                                          {subjectIndex + 1}
                                        </span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                          <h5 className="font-medium text-gold-200">
                                            {subject.name}
                                          </h5>
                                          {subject.code && (
                                            <Badge variant="info" className="text-xs">
                                              {subject.code}
                                            </Badge>
                                          )}
                                          {subject.hours && subject.hours > 0 && (
                                            <div className="flex items-center gap-1 text-gold-300/60" title="Horas calculadas automaticamente">
                                              <Clock className="w-3 h-3" />
                                              <span className="text-xs">{subject.hours}h ⚡</span>
                                            </div>
                                          )}
                                        </div>
                                        {subject.description && (
                                          <p className="text-sm text-gold-300/70 leading-relaxed">
                                            {subject.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      )
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { FileCheck, FileText, Clock, Target, RotateCcw, AlertCircle, ChevronRight, ChevronDown, Search, CheckCircle, Eye, BookOpen, X } from 'lucide-react'
import { Tables } from '@/lib/database.types'
import Card from '@/app/components/Card'
import Button from '@/app/components/Button'
import EmptyState from '@/app/components/EmptyState'
import { SkeletonCard } from '@/app/components/Skeleton'
import Link from 'next/link'
import Breadcrumbs from '@/app/components/ui/Breadcrumbs'

type Test = Tables<'tests'>
type TestGrade = Tables<'test_grades'>
type Course = Tables<'courses'>
type Subject = Tables<'subjects'>

interface TestWithDetails extends Test {
  course?: Course | null
  subject?: Subject | null
  grade?: TestGrade
}

interface CourseWithTests {
  course: Course
  tests: TestWithDetails[]
}

export default function StudentEvaluationsPage() {
  const [courseTests, setCourseTests] = useState<CourseWithTests[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadTests()
  }, [])

  const loadTests = async () => {
    try {
      // Buscar testes via API server-side (onde a sessão está disponível)
      const response = await fetch('/api/student/tests')

      if (!response.ok) {
        if (response.status === 401) {
          // Usuário não autenticado - redirecionar
          window.location.href = '/'
          return
        }
        throw new Error('Erro ao buscar testes')
      }

      const result = await response.json()

      if (result.success && result.data) {
        const courseTests = result.data.courseTests || []
        setCourseTests(courseTests)

        // Expandir automaticamente todos os cursos que têm testes
        const courseIds = courseTests
          .filter((ct: CourseWithTests) => ct.tests.length > 0)
          .map((ct: CourseWithTests) => ct.course.id)
        setExpandedCourses(new Set(courseIds))
      }
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleCourseExpansion = (courseId: string) => {
    setExpandedCourses(prev => {
      const newSet = new Set(prev)
      if (newSet.has(courseId)) {
        newSet.delete(courseId)
      } else {
        newSet.add(courseId)
      }
      return newSet
    })
  }

  const getFilteredTests = (tests: TestWithDetails[]) => {
    let filtered = tests

    // Filtro por status
    switch (filter) {
      case 'pending':
        filtered = filtered.filter((t: any) => {
          if (!t.grade) return true
          const passed = t.grade.best_score && t.grade.best_score >= (t.passing_score || 70)
          const hasAttemptsLeft = (t.grade.total_attempts || 0) < (t.max_attempts || 3)
          return !passed && hasAttemptsLeft
        })
        break
      case 'completed':
        filtered = filtered.filter((t: any) => t.grade && t.grade.best_score !== null)
        break
    }

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter((t: any) =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.subject?.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }

  const getTestStatus = (test: TestWithDetails) => {
    if (!test.grade) {
      return {
        label: 'Não realizado',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        icon: <AlertCircle className="w-4 h-4" />
      }
    }

    const passed = test.grade.best_score && test.grade.best_score >= (test.passing_score || 70)
    const hasAttemptsLeft = (test.grade.total_attempts || 0) < (test.max_attempts || 3)

    if (passed) {
      return {
        label: 'Aprovado',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        icon: <CheckCircle className="w-4 h-4" />
      }
    } else if (hasAttemptsLeft) {
      return {
        label: 'Em progresso',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        icon: <Clock className="w-4 h-4" />
      }
    } else {
      return {
        label: 'Reprovado',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        icon: <X className="w-4 h-4" />
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6">
          {[1, 2, 3].map(i => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  const totalTests = courseTests.reduce((acc, course) => acc + course.tests.length, 0)
  const completedTests = courseTests.reduce((acc, course) =>
    acc + course.tests.filter((t: any) => t.grade && t.grade.best_score !== null).length, 0
  )
  const pendingTests = courseTests.reduce((acc, course) =>
    acc + course.tests.filter((t: any) => {
      if (!t.grade) return true
      const passed = t.grade.best_score && t.grade.best_score >= (t.passing_score || 70)
      const hasAttemptsLeft = (t.grade.total_attempts || 0) < (t.max_attempts || 3)
      return !passed && hasAttemptsLeft
    }).length, 0
  )

  return (
    <div className="space-y-6">
      <Breadcrumbs className="mb-2" />

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold flex items-center gap-2">
          <FileCheck className="w-8 h-8 text-gold-400" />
          Minhas Avaliações
        </h1>
        <p className="text-gold-300 mt-1">Testes e trabalhos dos seus cursos</p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-gold-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Total de Avaliações</p>
              <p className="text-2xl font-bold text-gold">{totalTests}</p>
            </div>
            <FileText className="w-8 h-8 text-gold-400" />
          </div>
        </Card>

        <Card className="p-4 border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Concluídas</p>
              <p className="text-2xl font-bold text-green-400">{completedTests}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-4 border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-400">{pendingTests}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gold-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar avaliação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-navy-900/50 border border-gold-500/30 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>

          {/* Filtro por Status */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filter === 'all'
                  ? 'bg-gold-500 text-navy-900 font-medium'
                  : 'bg-navy-800/50 text-gold-300 hover:bg-navy-700/50'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filter === 'pending'
                  ? 'bg-gold-500 text-navy-900 font-medium'
                  : 'bg-navy-800/50 text-gold-300 hover:bg-navy-700/50'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filter === 'completed'
                  ? 'bg-gold-500 text-navy-900 font-medium'
                  : 'bg-navy-800/50 text-gold-300 hover:bg-navy-700/50'
              }`}
            >
              Concluídas
            </button>
          </div>
        </div>
      </Card>

      {/* Lista de Avaliações por Curso (Dropdown) */}
      {courseTests.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-16 h-16 text-gold-400/50" />}
          title="Nenhuma avaliação disponível"
          description="Você ainda não tem avaliações para realizar."
        />
      ) : (
        <div className="space-y-4">
          {courseTests.map(({ course, tests }) => {
            const filteredTests = getFilteredTests(tests)
            const isExpanded = expandedCourses.has(course.id)

            if (filteredTests.length === 0 && filter !== 'all') return null

            return (
              <Card key={course.id} className="overflow-hidden">
                {/* Header do Curso - Clicável */}
                <button
                  onClick={() => toggleCourseExpansion(course.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-navy-800/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gold-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gold-400" />
                    )}
                    <BookOpen className="w-5 h-5 text-gold-400" />
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-gold">{course.title}</h3>
                      <p className="text-sm text-gold-300">
                        {filteredTests.length} {filteredTests.length === 1 ? 'avaliação' : 'avaliações'}
                      </p>
                    </div>
                  </div>

                  {/* Resumo de Status */}
                  <div className="flex gap-4">
                    {tests.filter((t: any) => t.grade && t.grade.best_score >= (t.passing_score || 70)).length > 0 && (
                      <span className="text-sm text-green-400">
                        {tests.filter((t: any) => t.grade && t.grade.best_score >= (t.passing_score || 70)).length} aprovadas
                      </span>
                    )}
                    {tests.filter((t: any) => !t.grade || (t.grade.best_score < (t.passing_score || 70) && (t.grade.total_attempts || 0) < (t.max_attempts || 3))).length > 0 && (
                      <span className="text-sm text-yellow-400">
                        {tests.filter((t: any) => !t.grade || (t.grade.best_score < (t.passing_score || 70) && (t.grade.total_attempts || 0) < (t.max_attempts || 3))).length} pendentes
                      </span>
                    )}
                  </div>
                </button>

                {/* Lista de Testes - Expandível */}
                {isExpanded && filteredTests.length > 0 && (
                  <div className="border-t border-gold-500/20">
                    {filteredTests.map((test: any) => {
                      const status = getTestStatus(test)
                      const canTakeTest = !test.grade || (test.grade.total_attempts || 0) < (test.max_attempts || 3)

                      return (
                        <div
                          key={test.id}
                          className="p-4 border-b border-gold-500/10 last:border-b-0 hover:bg-navy-800/20 transition-all"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${status.bgColor}`}>
                                  {status.icon}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gold-100">{test.title}</h4>
                                  {test.description && (
                                    <p className="text-sm text-gold-300 mt-1">{test.description}</p>
                                  )}

                                  <div className="flex flex-wrap gap-4 mt-2">
                                    {test.subject && (
                                      <span className="text-xs text-gold-400">
                                        Disciplina: {test.subject.name}
                                      </span>
                                    )}
                                    {test.duration_minutes && (
                                      <span className="text-xs text-gold-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {test.duration_minutes} min
                                      </span>
                                    )}
                                    <span className="text-xs text-gold-400 flex items-center gap-1">
                                      <Target className="w-3 h-3" />
                                      Nota mínima: {test.passing_score || 70}
                                    </span>
                                    {test.grade && (
                                      <>
                                        <span className="text-xs text-gold-400 flex items-center gap-1">
                                          <RotateCcw className="w-3 h-3" />
                                          Tentativas: {test.grade.total_attempts || 0}/{test.max_attempts || 3}
                                        </span>
                                        {test.grade.best_score !== null && (
                                          <span className={`text-xs font-medium ${
                                            test.grade.best_score >= (test.passing_score || 70)
                                              ? 'text-green-400'
                                              : 'text-red-400'
                                          }`}>
                                            Melhor nota: {test.grade.best_score.toFixed(1)}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                                {status.label}
                              </span>

                              {canTakeTest && (
                                <Link href={`/student-dashboard/evaluations/${test.id}`}>
                                  <Button variant="primary" size="sm">
                                    {test.grade ? 'Refazer' : 'Iniciar'}
                                  </Button>
                                </Link>
                              )}

                              {test.grade && (
                                <Link href={`/student-dashboard/evaluations/${test.id}/results`}>
                                  <Button variant="secondary" size="sm">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {isExpanded && filteredTests.length === 0 && (
                  <div className="p-8 text-center text-gold-400">
                    <p>Nenhuma avaliação encontrada com os filtros aplicados.</p>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

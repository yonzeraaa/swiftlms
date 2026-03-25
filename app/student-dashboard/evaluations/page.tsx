'use client'

import { useState, useEffect } from 'react'
import { FileText, Clock, Target, RotateCcw, AlertCircle, ChevronRight, ChevronDown, Search, CheckCircle, Eye, BookOpen, X } from 'lucide-react'
import { Tables } from '@/lib/database.types'
import Spinner from '@/app/components/ui/Spinner'
import Link from 'next/link'
import { ClassicRule } from '../../components/ui/RenaissanceSvgs'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

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
      const response = await fetch('/api/student/tests')

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/'
          return
        }
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
        console.error('Erro da API:', response.status, errorData)
        throw new Error(errorData.error || 'Erro ao buscar testes')
      }

      const result = await response.json()

      if (result.success && result.data) {
        const courseTests = result.data.courseTests || []
        setCourseTests(courseTests)

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
        color: MUTED,
        bgColor: `${MUTED}/10`,
        icon: <AlertCircle size={16} />
      }
    }

    const passed = test.grade.best_score && test.grade.best_score >= (test.passing_score || 70)
    const hasAttemptsLeft = (test.grade.total_attempts || 0) < (test.max_attempts || 3)

    if (passed) {
      return {
        label: 'Aprovado',
        color: ACCENT,
        bgColor: `${ACCENT}/10`,
        icon: <CheckCircle size={16} />
      }
    } else if (hasAttemptsLeft) {
      return {
        label: 'Em progresso',
        color: '#b8860b',
        bgColor: 'rgba(184,134,11,0.1)',
        icon: <Clock size={16} />
      }
    } else {
      return {
        label: 'Reprovado',
        color: MUTED,
        bgColor: `${MUTED}/10`,
        icon: <X size={16} />
      }
    }
  }

  if (loading) {
    return <Spinner fullPage size="xl" />
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
    <div className="flex flex-col w-full">

      {/* ── Cabeçalho ── */}
      <div className="text-center flex flex-col items-center mb-12">
        <h1 style={{
          fontFamily: 'var(--font-playfair)',
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: 700,
          color: INK,
          lineHeight: 1,
          marginBottom: '0.5rem'
        }}>
          Minhas Avaliações
        </h1>
        <p style={{
          fontFamily: 'var(--font-lora)',
          fontSize: '1.1rem',
          fontStyle: 'italic',
          color: MUTED,
          marginBottom: '2rem'
        }}>
          Testes e trabalhos dos seus cursos
        </p>
        <ClassicRule style={{ width: '100%', maxWidth: '300px', color: INK }} />
      </div>

      {/* ── Estatísticas ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-10 mb-14 px-4">
        {[
          { label: 'Total de Avaliações', value: totalTests },
          { label: 'Concluídas', value: completedTests },
          { label: 'Pendentes', value: pendingTests },
        ].map((stat, idx) => (
          <div key={idx} className="flex flex-col items-center text-center relative">
            <span style={{
              fontFamily: 'var(--font-lora)',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: MUTED,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              marginBottom: '1rem'
            }}>
              {stat.label}
            </span>
            <span style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '3rem',
              fontWeight: 700,
              color: INK,
              lineHeight: 1,
            }}>
              {stat.value}
            </span>

            {idx !== 2 && (
              <div className="hidden md:block absolute right-[-2rem] top-[15%] bottom-[15%] w-px opacity-20" style={{ backgroundColor: INK }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Busca */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={18} style={{ color: MUTED }} />
            <input
              type="text"
              placeholder="Buscar avaliação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '2.75rem',
                paddingRight: '1rem',
                paddingTop: '0.75rem',
                paddingBottom: '0.75rem',
                backgroundColor: 'transparent',
                border: `1px solid ${BORDER}`,
                color: INK,
                fontFamily: 'var(--font-lora)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Filtro por Status */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'pending', label: 'Pendentes' },
            { key: 'completed', label: 'Concluídas' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '4px',
                fontFamily: 'var(--font-lora)',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: filter === key ? ACCENT : 'transparent',
                color: filter === key ? PARCH : MUTED,
                border: `1px solid ${filter === key ? ACCENT : BORDER}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Lista de Avaliações por Curso ── */}
      {courseTests.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={48} style={{ color: MUTED, opacity: 0.5, margin: '0 auto 1rem' }} />
          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1rem', color: MUTED, fontStyle: 'italic' }}>
            Você ainda não tem avaliações para realizar.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {courseTests.map(({ course, tests }) => {
            const filteredTests = getFilteredTests(tests)
            const isExpanded = expandedCourses.has(course.id)

            if (filteredTests.length === 0 && filter !== 'all') return null

            return (
              <div
                key={course.id}
                style={{
                  backgroundColor: PARCH,
                  border: `1px solid ${BORDER}`,
                  boxShadow: '0 2px 8px rgba(30,19,12,0.06)',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
                {/* Header do Curso */}
                <button
                  onClick={() => toggleCourseExpansion(course.id)}
                  className="w-full p-5 flex items-center justify-between transition-all hover:bg-black/5"
                >
                  <div className="flex items-center gap-4">
                    <div style={{ color: ACCENT }}>
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                    <BookOpen size={20} style={{ color: ACCENT }} />
                    <div className="text-left">
                      <h3 style={{
                        fontFamily: 'var(--font-playfair)',
                        fontSize: '1.2rem',
                        fontWeight: 600,
                        color: INK,
                      }}>
                        {course.title}
                      </h3>
                      <p style={{
                        fontFamily: 'var(--font-lora)',
                        fontSize: '0.85rem',
                        color: MUTED,
                      }}>
                        {filteredTests.length} {filteredTests.length === 1 ? 'avaliação' : 'avaliações'}
                      </p>
                    </div>
                  </div>

                  {/* Resumo de Status */}
                  <div className="flex gap-6">
                    {tests.filter((t: any) => t.grade && t.grade.best_score >= (t.passing_score || 70)).length > 0 && (
                      <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.85rem', color: ACCENT, fontWeight: 600 }}>
                        {tests.filter((t: any) => t.grade && t.grade.best_score >= (t.passing_score || 70)).length} aprovadas
                      </span>
                    )}
                    {tests.filter((t: any) => !t.grade || (t.grade.best_score < (t.passing_score || 70) && (t.grade.total_attempts || 0) < (t.max_attempts || 3))).length > 0 && (
                      <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.85rem', color: '#b8860b' }}>
                        {tests.filter((t: any) => !t.grade || (t.grade.best_score < (t.passing_score || 70) && (t.grade.total_attempts || 0) < (t.max_attempts || 3))).length} pendentes
                      </span>
                    )}
                  </div>
                </button>

                {/* Lista de Testes */}
                {isExpanded && filteredTests.length > 0 && (
                  <div className="border-t" style={{ borderColor: BORDER }}>
                    {filteredTests.map((test: any) => {
                      const status = getTestStatus(test)
                      const canTakeTest = !test.grade || (test.grade.total_attempts || 0) < (test.max_attempts || 3)

                      return (
                        <div
                          key={test.id}
                          className="p-5 border-b last:border-b-0 transition-all hover:bg-black/[0.02]"
                          style={{ borderColor: BORDER }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-start gap-4">
                                <div
                                  className="p-2 rounded-sm flex-shrink-0"
                                  style={{ backgroundColor: status.bgColor, color: status.color }}
                                >
                                  {status.icon}
                                </div>
                                <div className="flex-1">
                                  <h4 style={{
                                    fontFamily: 'var(--font-lora)',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    color: INK,
                                  }}>
                                    {test.title}
                                  </h4>
                                  {test.description && (
                                    <p style={{
                                      fontFamily: 'var(--font-lora)',
                                      fontSize: '0.85rem',
                                      color: MUTED,
                                      marginTop: '0.25rem'
                                    }}>
                                      {test.description}
                                    </p>
                                  )}

                                  <div className="flex flex-wrap gap-4 mt-3">
                                    {test.subject && (
                                      <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.8rem', color: MUTED }}>
                                        Disciplina: {test.subject.name}
                                      </span>
                                    )}
                                    {test.duration_minutes && (
                                      <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.8rem', color: MUTED, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Clock size={14} /> {test.duration_minutes} min
                                      </span>
                                    )}
                                    <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.8rem', color: MUTED, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                      <Target size={14} /> Nota mínima: {test.passing_score || 70}
                                    </span>
                                    {test.grade && (
                                      <>
                                        <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.8rem', color: MUTED, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                          <RotateCcw size={14} /> Tentativas: {test.grade.total_attempts || 0}/{test.max_attempts || 3}
                                        </span>
                                        {test.grade.best_score !== null && (
                                          <span style={{
                                            fontFamily: 'var(--font-lora)',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            color: test.grade.best_score >= (test.passing_score || 70) ? ACCENT : MUTED
                                          }}>
                                            Melhor nota: {test.grade.best_score.toFixed(1)}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span
                                className="px-3 py-1 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: status.bgColor,
                                  color: status.color,
                                  fontFamily: 'var(--font-lora)',
                                  fontWeight: 600,
                                }}
                              >
                                {status.label}
                              </span>

                              {canTakeTest && (
                                <Link href={`/student-dashboard/evaluations/${test.id}`}>
                                  <button
                                    style={{
                                      padding: '0.5rem 1.25rem',
                                      borderRadius: '4px',
                                      backgroundColor: ACCENT,
                                      color: PARCH,
                                      border: 'none',
                                      fontFamily: 'var(--font-lora)',
                                      fontSize: '0.85rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {test.grade ? 'Refazer' : 'Iniciar'}
                                  </button>
                                </Link>
                              )}

                              {test.grade && (
                                <Link href={`/student-dashboard/evaluations/${test.id}/results`}>
                                  <button
                                    style={{
                                      padding: '0.5rem',
                                      borderRadius: '4px',
                                      backgroundColor: 'transparent',
                                      color: MUTED,
                                      border: `1px solid ${BORDER}`,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Eye size={18} />
                                  </button>
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
                  <div className="p-8 text-center" style={{ backgroundColor: `${INK}/3` }}>
                    <p style={{ fontFamily: 'var(--font-lora)', fontSize: '0.95rem', color: MUTED, fontStyle: 'italic' }}>
                      Nenhuma avaliação encontrada com os filtros aplicados.
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

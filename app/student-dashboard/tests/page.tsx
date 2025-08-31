'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileCheck, Clock, Target, RotateCcw, Award, AlertCircle, ChevronRight, Search, TrendingUp, Calendar, CheckCircle, PlayCircle, Eye } from 'lucide-react'
import { Tables } from '@/lib/database.types'
import Card from '@/app/components/Card'
import Button from '@/app/components/Button'
import EmptyState from '@/app/components/EmptyState'
import { SkeletonCard } from '@/app/components/Skeleton'
import { useTranslation } from '@/app/contexts/LanguageContext'
import Link from 'next/link'

type Test = Tables<'tests'>
type TestGrade = Tables<'test_grades'>
type Course = Tables<'courses'>
type Subject = Tables<'subjects'>

interface TestWithDetails extends Test {
  course?: Course | null
  subject?: Subject | null
  grade?: TestGrade
}

export default function StudentTestsPage() {
  const [tests, setTests] = useState<TestWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'deadline' | 'score'>('recent')
  const supabase = createClient()
  const { t } = useTranslation()

  useEffect(() => {
    loadTests()
  }, [])

  const loadTests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Buscar cursos em que o aluno está matriculado
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user.id)
      
      if (!enrollments || enrollments.length === 0) {
        setTests([])
        setLoading(false)
        return
      }

      const courseIds = enrollments.map(e => e.course_id)

      // Buscar testes ativos desses cursos
      const { data: testsData } = await supabase
        .from('tests')
        .select(`
          *,
          course:courses(*),
          subject:subjects(*)
        `)
        .in('course_id', courseIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      // Buscar notas do aluno nesses testes
      if (testsData) {
        const testIds = testsData.map(t => t.id)
        const { data: grades } = await supabase
          .from('test_grades')
          .select('*')
          .eq('user_id', user.id)
          .in('test_id', testIds)

        // Combinar testes com notas
        const testsWithGrades = testsData.map(test => ({
          ...test,
          grade: grades?.find(g => g.test_id === test.id) || undefined
        }))

        setTests(testsWithGrades)
      }
    } catch (error) {
      console.error('Erro ao carregar testes:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredTests = () => {
    let filtered = tests

    // Filtro por status
    switch (filter) {
      case 'pending':
        filtered = filtered.filter(t => {
          if (!t.grade) return true
          const passed = t.grade.best_score && t.grade.best_score >= (t.passing_score || 70)
          const hasAttemptsLeft = (t.grade.total_attempts || 0) < (t.max_attempts || 3)
          return !passed && hasAttemptsLeft
        })
        break
      case 'completed':
        filtered = filtered.filter(t => t.grade && t.grade.best_score !== null)
        break
    }

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.course?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.subject?.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Ordenação
    switch (sortBy) {
      case 'deadline':
        // Ordenar por prazo (simulado - usar created_at como proxy)
        filtered = [...filtered].sort((a, b) => {
          const dateA = new Date(a.created_at || '').getTime()
          const dateB = new Date(b.created_at || '').getTime()
          return dateB - dateA
        })
        break
      case 'score':
        // Ordenar por nota
        filtered = [...filtered].sort((a, b) => {
          const scoreA = a.grade?.best_score || 0
          const scoreB = b.grade?.best_score || 0
          return scoreB - scoreA
        })
        break
      default:
        // Manter ordem recente (padrão)
        break
    }

    return filtered
  }

  const getTestStatus = (test: TestWithDetails) => {
    if (!test.grade) {
      return {
        label: 'Não Iniciado',
        color: 'bg-navy-900/50 text-gold-300 border border-gold-500/30',
        icon: FileCheck
      }
    }
    
    const attempts = test.grade.total_attempts || 0
    const maxAttempts = test.max_attempts || 3
    const hasAttemptsLeft = attempts < maxAttempts
    const passed = test.grade.best_score && test.grade.best_score >= (test.passing_score || 70)

    if (passed) {
      return {
        label: 'Aprovado',
        color: 'bg-green-900/30 text-green-400 border border-green-500/50',
        icon: Award
      }
    } else if (hasAttemptsLeft) {
      return {
        label: `${attempts}/${maxAttempts} Tentativas`,
        color: 'bg-gold-900/30 text-gold-400 border border-gold-500/50',
        icon: RotateCcw
      }
    } else {
      return {
        label: 'Tentativas Esgotadas',
        color: 'bg-red-900/30 text-red-400 border border-red-500/50',
        icon: AlertCircle
      }
    }
  }

  // Calcular estatísticas
  const stats = {
    total: tests.length,
    pending: tests.filter(t => {
      // Um teste é pendente se:
      // 1. Nunca foi feito (sem grade)
      // 2. Foi feito mas não passou E ainda tem tentativas restantes
      if (!t.grade) return true
      const passed = t.grade.best_score && t.grade.best_score >= (t.passing_score || 70)
      const hasAttemptsLeft = (t.grade.total_attempts || 0) < (t.max_attempts || 3)
      return !passed && hasAttemptsLeft
    }).length,
    completed: tests.filter(t => t.grade && t.grade.best_score !== null).length,
    averageScore: tests.filter(t => t.grade?.best_score).reduce((acc, t) => acc + (t.grade?.best_score || 0), 0) / 
                  (tests.filter(t => t.grade?.best_score).length || 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gold">
            Meus Testes
          </h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ animationDelay: `${i * 100}ms` }}>
              <SkeletonCard />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const filteredTests = getFilteredTests()

  return (
    <div className="min-h-screen space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gold">
          Meus Testes
        </h1>
        <div className="text-gold-400/60 text-sm">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="elevated" className="border-l-4 border-gold-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gold-300">Total de Testes</p>
              <p className="text-2xl font-bold text-gold">{stats.total}</p>
            </div>
            <div className="p-3 bg-gold-500/10 rounded-lg">
              <FileCheck className="w-6 h-6 text-gold-500" />
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gold-300">Pendentes</p>
              <p className="text-2xl font-bold text-gold">{stats.pending}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gold-300">Concluídos</p>
              <p className="text-2xl font-bold text-gold">{stats.completed}</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gold-300">Média Geral</p>
              <p className="text-2xl font-bold text-gold">{stats.averageScore.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Barra de Busca e Filtros */}
      <Card variant="elevated">
        <div className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gold-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar testes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-navy-900/50 border border-gold-500/30 rounded-xl text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filtros e Ordenação */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Filtros de Status */}
            <div className="flex gap-2 flex-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all border ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-navy-900 border-gold-400 shadow-lg shadow-gold-500/20'
                    : 'bg-navy-900/50 text-gold-300 hover:bg-navy-900/70 border-gold-500/30'
                }`}
              >
                Todos ({stats.total})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg font-medium transition-all border ${
                  filter === 'pending'
                    ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-navy-900 border-gold-400 shadow-lg shadow-gold-500/20'
                    : 'bg-navy-900/50 text-gold-300 hover:bg-navy-900/70 border-gold-500/30'
                }`}
              >
                Pendentes ({stats.pending})
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-4 py-2 rounded-lg font-medium transition-all border ${
                  filter === 'completed'
                    ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-navy-900 border-gold-400 shadow-lg shadow-gold-500/20'
                    : 'bg-navy-900/50 text-gold-300 hover:bg-navy-900/70 border-gold-500/30'
                }`}
              >
                Concluídos ({stats.completed})
              </button>
            </div>

            {/* Ordenação */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 bg-navy-900/50 border border-gold-500/30 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
            >
              <option value="recent">Mais Recentes</option>
              <option value="deadline">Por Prazo</option>
              <option value="score">Por Nota</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Lista de Testes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredTests.map((test, index) => {
          const status = getTestStatus(test)
          const StatusIcon = status.icon
          const canAttempt = !test.grade || (test.grade.total_attempts || 0) < (test.max_attempts || 3)
          
          return (
            <div
              key={test.id}
              className="transform transition-all duration-300 hover:scale-[1.02] animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Card variant="elevated" className="h-full border-l-4 border-gold-500 overflow-hidden">
                <div className="flex flex-col h-full">
                  {/* Header do Card */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-gold-500/30 to-gold-600/20 rounded-lg border border-gold-500/30">
                        <FileCheck className="w-5 h-5 text-gold" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gold">
                          {test.title}
                        </h3>
                        {test.course && (
                          <p className="text-xs text-gold-300">
                            {test.course.title}
                            {test.subject && ` • ${test.subject.name}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full flex items-center gap-1 text-xs ${status.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      <span className="font-medium">{status.label}</span>
                    </div>
                  </div>

                  {/* Descrição */}
                  {test.description && (
                    <p className="text-sm text-gold-300/80 mb-4 line-clamp-2">{test.description}</p>
                  )}

                  {/* Informações do Teste */}
                  <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                    <div className="flex items-center gap-1 text-gold-400">
                      <Clock className="w-3 h-3 text-gold-500/50" />
                      <span>{test.duration_minutes}min</span>
                    </div>
                    <div className="flex items-center gap-1 text-gold-400">
                      <Target className="w-3 h-3 text-gold-500/50" />
                      <span>{test.passing_score}%</span>
                    </div>
                    <div className="flex items-center gap-1 text-gold-400">
                      <RotateCcw className="w-3 h-3 text-gold-500/50" />
                      <span>{test.max_attempts}x</span>
                    </div>
                  </div>

                  {/* Score Display */}
                  {test.grade && test.grade.best_score !== null && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gold-300">Melhor nota</span>
                        <span className={`text-lg font-bold ${
                          test.grade.best_score >= (test.passing_score || 70)
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}>
                          {test.grade.best_score.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            test.grade.best_score >= (test.passing_score || 70)
                              ? 'bg-gradient-to-r from-green-500 to-green-600'
                              : 'bg-gradient-to-r from-red-500 to-red-600'
                          }`}
                          style={{ width: `${Math.min(100, test.grade.best_score)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="mt-auto flex gap-2">
                    {canAttempt ? (
                      <Link href={`/student-dashboard/tests/${test.id}`} className="flex-1">
                        <Button 
                          variant="primary" 
                          size="sm" 
                          className="w-full"
                          icon={test.grade ? <RotateCcw className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                          iconPosition="left"
                        >
                          {test.grade ? 'Tentar Novamente' : 'Responder Teste'}
                        </Button>
                      </Link>
                    ) : test.grade && (
                      <Link href={`/student-dashboard/tests/${test.id}/results`} className="flex-1">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="w-full"
                          icon={<Eye className="w-4 h-4" />}
                          iconPosition="left"
                        >
                          Ver Resultado
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )
        })}
      </div>

      {filteredTests.length === 0 && (
        <EmptyState
          variant="no-data"
          iconType="files"
          title={
            searchTerm
              ? 'Nenhum resultado encontrado'
              : filter === 'pending'
              ? 'Nenhum teste pendente'
              : filter === 'completed'
              ? 'Nenhum teste concluído'
              : 'Nenhum teste disponível'
          }
          description="Verifique novamente mais tarde"
          size="lg"
        />
      )}
    </div>
  )
}
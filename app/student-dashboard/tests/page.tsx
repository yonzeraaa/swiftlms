'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileCheck, Clock, Target, RotateCcw, Award, AlertCircle, ChevronRight, Sparkles } from 'lucide-react'
import { Tables } from '@/lib/database.types'
import Card from '@/app/components/Card'
import Button from '@/app/components/Button'
import EmptyState from '@/app/components/EmptyState'
import PremiumLoader from '@/app/components/ui/PremiumLoader'
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
    switch (filter) {
      case 'pending':
        return tests.filter(t => !t.grade || (t.grade.total_attempts || 0) < (t.max_attempts || 3))
      case 'completed':
        return tests.filter(t => t.grade && t.grade.best_score !== null)
      default:
        return tests
    }
  }

  const getTestStatus = (test: TestWithDetails) => {
    if (!test.grade) {
      return {
        label: t('tests.notStarted'),
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
        label: t('tests.approved'),
        color: 'bg-green-900/30 text-green-400 border border-green-500/50',
        icon: Award
      }
    } else if (hasAttemptsLeft) {
      return {
        label: `${attempts}/${maxAttempts} ${t('tests.attempts')}`,
        color: 'bg-gold-900/30 text-gold-400 border border-gold-500/50',
        icon: RotateCcw
      }
    } else {
      return {
        label: t('tests.attemptsExhausted'),
        color: 'bg-red-900/30 text-red-400 border border-red-500/50',
        icon: AlertCircle
      }
    }
  }

  if (loading) return <PremiumLoader />

  const filteredTests = getFilteredTests()

  return (
    <div className="min-h-screen">
      {/* Header */}
      <Card variant="gradient" className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gold flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-gold-400 animate-pulse" />
              {t('tests.myTests')}
            </h1>
            <p className="text-gold-300 mt-1">
              {t('tests.trackProgress')}
            </p>
          </div>
          <div className="text-gold-400/60 text-sm">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </Card>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all border ${
            filter === 'all'
              ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-navy-900 border-gold-400 shadow-lg shadow-gold-500/20'
              : 'bg-navy-900/50 text-gold-300 hover:bg-navy-900/70 border-gold-500/30'
          }`}
        >
          {t('tests.all')} ({tests.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition-all border ${
            filter === 'pending'
              ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-navy-900 border-gold-400 shadow-lg shadow-gold-500/20'
              : 'bg-navy-900/50 text-gold-300 hover:bg-navy-900/70 border-gold-500/30'
          }`}
        >
          {t('tests.pending')} ({tests.filter(t => !t.grade || (t.grade.total_attempts || 0) < (t.max_attempts || 3)).length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg font-medium transition-all border ${
            filter === 'completed'
              ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-navy-900 border-gold-400 shadow-lg shadow-gold-500/20'
              : 'bg-navy-900/50 text-gold-300 hover:bg-navy-900/70 border-gold-500/30'
          }`}
        >
          {t('tests.completed')} ({tests.filter(t => t.grade && t.grade.best_score !== null).length})
        </button>
      </div>

      {/* Lista de Testes */}
      <div className="grid gap-4">
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
              <Card variant="elevated" className="border-l-4 border-gold-500 overflow-hidden"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-gradient-to-br from-gold-500/30 to-gold-600/20 rounded-lg border border-gold-500/30">
                        <FileCheck className="w-6 h-6 text-gold" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gold">
                          {test.title}
                        </h3>
                        {test.course && (
                          <p className="text-sm text-gold-300">
                            {test.course.title}
                            {test.subject && ` • ${test.subject.name}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {test.description && (
                      <p className="text-gold-300/80 mb-4">{test.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-gold-400">
                        <Clock className="w-4 h-4 text-gold-500/50" />
                        <span>{test.duration_minutes} {t('tests.minutes')}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gold-400">
                        <Target className="w-4 h-4 text-gold-500/50" />
                        <span>{t('tests.minScore')}: {test.passing_score}%</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gold-400">
                        <RotateCcw className="w-4 h-4 text-gold-500/50" />
                        <span>{test.max_attempts} {t('tests.attempts')}</span>
                      </div>
                    </div>

                    {test.grade && test.grade.best_score !== null && (
                      <div className="mt-4 p-3 bg-navy-900/50 rounded-lg border border-gold-500/30">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gold-300">{t('tests.bestScore')}:</span>
                          <span className={`text-2xl font-bold ${
                            test.grade.best_score >= (test.passing_score || 70)
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}>
                            {test.grade.best_score.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 ${status.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">{status.label}</span>
                    </div>

                    {canAttempt ? (
                      <Link
                        href={`/student-dashboard/tests/${test.id}`}
                        className="group"
                      >
                        <Button variant="primary" size="sm" className="flex items-center gap-2">
                          {test.grade ? t('tests.tryAgain') : t('tests.takeTest')}
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </Link>
                    ) : test.grade && (
                      <Link
                        href={`/student-dashboard/tests/${test.id}/results`}
                        className="group"
                      >
                        <Button variant="secondary" size="sm" className="flex items-center gap-2">
                          {t('tests.viewResult')}
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Barra de progresso visual */}
                {test.grade && test.grade.best_score !== null && (
                  <div className="h-2 bg-navy-900">
                    <div
                      className={`h-full transition-all duration-500 ${
                        test.grade.best_score >= (test.passing_score || 70)
                          ? 'bg-gradient-to-r from-green-500 to-green-600'
                          : 'bg-gradient-to-r from-red-500 to-red-600'
                      }`}
                      style={{ width: `${Math.min(100, test.grade.best_score)}%` }}
                    />
                  </div>
                )}
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
            filter === 'pending'
              ? t('tests.noPendingTests')
              : filter === 'completed'
              ? t('tests.noCompletedTests')
              : t('tests.noTestsAvailable')
          }
          description={t('tests.checkBackLater')}
          size="lg"
        />
      )}
    </div>
  )
}
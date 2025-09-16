'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/database.types'
import TestResults from '@/app/components/TestResults'
import { SkeletonCard } from '@/app/components/Skeleton'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from '@/app/contexts/LanguageContext'
import Card from '@/app/components/Card'
import Button from '@/app/components/Button'

type Test = Tables<'tests'>
type TestAttempt = Tables<'test_attempts'>
type TestGrade = Tables<'test_grades'>

export default function TestResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const [test, setTest] = useState<Test | null>(null)
  const [latestAttempt, setLatestAttempt] = useState<TestAttempt | null>(null)
  const [testGrade, setTestGrade] = useState<TestGrade | null>(null)
  const [loading, setLoading] = useState(true)
  const [canRetry, setCanRetry] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()
  const { t } = useTranslation()

  useEffect(() => {
    loadTestResults()
  }, [])

  const loadTestResults = async () => {
    try {
      const { id } = await params
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Buscar dados do teste
      const { data: testData } = await supabase
        .from('tests')
        .select('*')
        .eq('id', id)
        .single()

      if (!testData) {
        router.push('/student-dashboard/evaluations')
        return
      }

      setTest(testData)

      // Buscar última tentativa do usuário
      const { data: attempts } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('test_id', id)
        .eq('user_id', user.id)
        .order('attempt_number', { ascending: false })
        .limit(1)

      if (attempts && attempts.length > 0) {
        setLatestAttempt(attempts[0])
        
        // Verificar se pode tentar novamente
        const maxAttempts = testData.max_attempts || 3
        const attemptCount = attempts[0].attempt_number || 1
        setCanRetry(attemptCount < maxAttempts)
      } else {
        // Se não há tentativas, redirecionar para fazer o teste
        router.push(`/student-dashboard/evaluations/${id}`)
        return
      }

      // Buscar nota do teste
      const { data: gradeData } = await supabase
        .from('test_grades')
        .select('*')
        .eq('test_id', id)
        .eq('user_id', user.id)
        .single()

      if (gradeData) {
        setTestGrade(gradeData)
      }

    } catch (error) {
      console.error('Erro ao carregar resultados:', error)
      router.push('/student-dashboard/evaluations')
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    if (test && canRetry) {
      router.push(`/student-dashboard/evaluations/${test.id}`)
    }
  }

  const handleExit = () => {
    router.push('/student-dashboard/evaluations')
  }

  if (loading) {
    return (
      <div className="min-h-screen space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} style={{ animationDelay: `${i * 100}ms` }}>
            <SkeletonCard />
          </div>
        ))}
      </div>
    )
  }

  if (!test || !latestAttempt) {
    return (
      <div className="min-h-screen">
        <Card variant="elevated" className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4 text-gold">
            {t('test.noResultsFound')}
          </h2>
          <p className="text-gold-300 mb-6">
            {t('test.noResultsDescription')}
          </p>
          <Button onClick={handleExit} variant="primary">
            {t('test.backToTests')}
          </Button>
        </Card>
      </div>
    )
  }

  // Calcular estatísticas
  const score = latestAttempt.score || 0
  const passed = score >= (test.passing_score || 70)
  const answers = latestAttempt.answers as Record<string, string> || {}
  const totalQuestions = Object.keys(answers).length
  const correctCount = Math.round(score * totalQuestions / 100)

  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <Link
          href="/student-dashboard/evaluations"
          className="inline-flex items-center gap-2 text-gold-300 hover:text-gold transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          {t('test.backToTests')}
        </Link>
      </div>

      <TestResults
        testId={test.id}
        attemptId={latestAttempt.id}
        score={score}
        passed={passed}
        correctCount={correctCount}
        totalQuestions={totalQuestions}
        passingScore={test.passing_score || 70}
        onRetry={canRetry ? handleRetry : undefined}
        onExit={handleExit}
      />

      {/* Informações adicionais */}
      <Card variant="elevated" className="mt-6">
        <h3 className="text-lg font-semibold text-gold mb-4">
          {t('test.attemptHistory')}
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gold-300">{t('test.attemptNumber')}:</span>
            <span className="text-gold font-medium">
              {latestAttempt.attempt_number} / {test.max_attempts || 3}
            </span>
          </div>
          {testGrade && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gold-300">{t('test.bestScore')}:</span>
                <span className="text-gold font-medium">
                  {testGrade.best_score?.toFixed(1) || 0}%
                </span>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

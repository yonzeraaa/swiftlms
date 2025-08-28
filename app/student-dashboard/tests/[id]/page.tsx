'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TestViewer from '@/app/components/TestViewer'
import TestResults from '@/app/components/TestResults'
import PremiumLoader from '@/app/components/ui/PremiumLoader'
import { Tables } from '@/lib/database.types'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from '@/app/contexts/LanguageContext'

type Test = Tables<'tests'>

export default function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const [test, setTest] = useState<Test | null>(null)
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showResults, setShowResults] = useState(false)
  const [attemptData, setAttemptData] = useState<{
    id: string
    score: number
    passed: boolean
    correctCount: number
    totalQuestions: number
  } | null>(null)
  
  const router = useRouter()
  const supabase = createClient()
  const { t } = useTranslation()

  useEffect(() => {
    loadTestData()
  }, [])

  const loadTestData = async () => {
    try {
      const { id } = await params
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Buscar teste
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', id)
        .single()

      if (testError || !testData) {
        console.error('Erro ao carregar teste:', testError)
        router.push('/student-dashboard/tests')
        return
      }

      if (!testData.is_active) {
        alert(t('test.notAvailable'))
        router.push('/student-dashboard/tests')
        return
      }

      setTest(testData)

      // Buscar enrollment
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', testData.course_id || '')
        .single()

      if (!enrollment) {
        alert(t('test.enrollmentRequired'))
        router.push('/student-dashboard/tests')
        return
      }

      setEnrollmentId(enrollment.id)

      // Verificar tentativas
      const { data: attempts } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('test_id', id)
        .eq('user_id', user.id)
        .order('attempt_number', { ascending: false })

      const maxAttempts = testData.max_attempts || 3
      const attemptCount = attempts ? attempts.length : 0

      if (attemptCount >= maxAttempts) {
        // Mostrar resultados da última tentativa
        router.push(`/student-dashboard/tests/${id}/results`)
        return
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      router.push('/student-dashboard/tests')
    } finally {
      setLoading(false)
    }
  }

  const handleTestComplete = (attemptId: string, score: number, passed: boolean) => {
    // Buscar dados completos da tentativa
    supabase
      .from('test_attempts')
      .select('*')
      .eq('id', attemptId)
      .single()
      .then(({ data }) => {
        if (data) {
          const answers = data.answers as Record<string, string>
          const totalQuestions = Object.keys(answers).length
          
          setAttemptData({
            id: attemptId,
            score,
            passed,
            correctCount: Math.round(score * totalQuestions / 100),
            totalQuestions
          })
          setShowResults(true)
        }
      })
  }

  if (loading) return <PremiumLoader />
  if (!test || !enrollmentId) return null

  if (showResults && attemptData) {
    return (
      <div className="min-h-screen">
        <div className="mb-6">
          <Link
            href="/student-dashboard/tests"
            className="inline-flex items-center gap-2 text-gold-300 hover:text-gold transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            {t('test.backToTests')}
          </Link>
        </div>
        
        <TestResults
          testId={test.id}
          attemptId={attemptData.id}
          score={attemptData.score}
          passed={attemptData.passed}
          correctCount={attemptData.correctCount}
          totalQuestions={attemptData.totalQuestions}
          passingScore={test.passing_score || 70}
          onRetry={() => {
            setShowResults(false)
            setAttemptData(null)
            loadTestData()
          }}
          onExit={() => router.push('/student-dashboard/tests')}
        />
      </div>
    )
  }

  return (
    <div className="h-screen -m-8">
      <TestViewer 
        test={test}
        enrollmentId={enrollmentId}
        onComplete={handleTestComplete}
      />
    </div>
  )
}
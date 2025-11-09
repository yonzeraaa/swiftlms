'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TestViewer from '@/app/components/TestViewer'
import TestResults from '@/app/components/TestResults'
import { SkeletonCard } from '@/app/components/Skeleton'
import { Tables } from '@/lib/database.types'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from '@/app/contexts/LanguageContext'
import { getTestForTaking } from '@/lib/actions/evaluations'

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
  const { t } = useTranslation()

  useEffect(() => {
    loadTestData()
  }, [])

  const loadTestData = async () => {
    try {
      const { id } = await params
      const result = await getTestForTaking(id)

      if (!result.success) {
        alert(result.error)
        router.push('/student-dashboard/evaluations')
        return
      }

      if (!result.test || !result.test.is_active) {
        alert(t('test.notAvailable'))
        router.push('/student-dashboard/evaluations')
        return
      }

      setTest(result.test as Test)
      setEnrollmentId(result.enrollment?.id || null)

      // Check if max attempts reached
      const maxAttempts = result.test.max_attempts || 3
      const attemptCount = result.attempts?.length || 0

      if (attemptCount >= maxAttempts) {
        router.push(`/student-dashboard/evaluations/${id}/results`)
        return
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      router.push('/student-dashboard/evaluations')
    } finally {
      setLoading(false)
    }
  }

  const handleTestComplete = async (attemptId: string, score: number, passed: boolean) => {
    try {
      const response = await fetch('/api/test-attempts/' + attemptId)
      const data = await response.json()

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
    } catch (error) {
      console.error('Error fetching attempt data:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-2xl">
          <SkeletonCard />
        </div>
      </div>
    )
  }
  if (!test || !enrollmentId) return null

  if (showResults && attemptData) {
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
          onExit={() => router.push('/student-dashboard/evaluations')}
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

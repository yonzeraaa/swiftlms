'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TestResults from '@/app/components/TestResults'
import PremiumLoader from '@/app/components/ui/PremiumLoader'
import { Tables } from '@/lib/database.types'
import { ArrowLeft, Clock, Calendar, FileCheck, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

type Test = Tables<'tests'>
type TestAttempt = Tables<'test_attempts'>
type TestGrade = Tables<'test_grades'>

interface AttemptWithDetails extends TestAttempt {
  grade?: TestGrade
}

export default function TestResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const [test, setTest] = useState<Test | null>(null)
  const [attempts, setAttempts] = useState<AttemptWithDetails[]>([])
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [totalQuestions, setTotalQuestions] = useState(0)
  
  const router = useRouter()
  const supabase = createClient()

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

      setTest(testData)

      // Buscar tentativas do aluno
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('test_id', id)
        .eq('user_id', user.id)
        .order('attempt_number', { ascending: false })

      if (attemptsError) {
        console.error('Erro ao carregar tentativas:', attemptsError)
        return
      }

      if (!attemptsData || attemptsData.length === 0) {
        // Sem tentativas ainda
        router.push('/student-dashboard/tests')
        return
      }

      // Buscar nota do aluno
      const { data: gradeData } = await supabase
        .from('test_grades')
        .select('*')
        .eq('test_id', id)
        .eq('user_id', user.id)
        .single()

      // Combinar dados
      const attemptsWithGrade = attemptsData.map(attempt => ({
        ...attempt,
        grade: gradeData
      }))

      setAttempts(attemptsWithGrade)
      
      // Selecionar melhor tentativa por padrão
      const bestAttempt = attemptsWithGrade.reduce((best, current) => 
        (current.score || 0) > (best.score || 0) ? current : best
      )
      setSelectedAttempt(bestAttempt)

      // Calcular total de questões
      if (bestAttempt.answers) {
        const answers = bestAttempt.answers as Record<string, string>
        setTotalQuestions(Object.keys(answers).length)
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      router.push('/student-dashboard/tests')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  if (loading) return <PremiumLoader />
  if (!test || !selectedAttempt) return null

  const canRetry = attempts.length < (test.max_attempts || 3)
  const correctCount = Math.round((selectedAttempt.score || 0) * totalQuestions / 100)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/student-dashboard/tests"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar aos Testes
        </Link>
        
        <h1 className="text-3xl font-bold text-navy-900 mb-2">Resultados do Teste</h1>
        <p className="text-gray-600">{test.title}</p>
      </div>

      {/* Seletor de Tentativas */}
      {attempts.length > 1 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Suas Tentativas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {attempts.map(attempt => (
              <motion.button
                key={attempt.id}
                onClick={() => setSelectedAttempt(attempt)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedAttempt.id === attempt.id
                    ? 'border-gold-500 bg-gold-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-gold-300'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-navy-900">
                    Tentativa {attempt.attempt_number}
                  </span>
                  {attempt.grade && attempt.score === attempt.grade.best_score && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Melhor
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold mb-1">
                  <span className={attempt.passed ? 'text-green-600' : 'text-red-600'}>
                    {(attempt.score || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(attempt.created_at)}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Informações Detalhadas da Tentativa */}
      <div className="mb-8 bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-navy-900 mb-4">Detalhes da Tentativa</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 text-gold-500" />
            <div>
              <p className="text-sm text-gray-600">Data</p>
              <p className="font-medium text-navy-900">
                {formatDate(selectedAttempt.created_at)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Clock className="w-5 h-5 text-gold-500" />
            <div>
              <p className="text-sm text-gray-600">Duração</p>
              <p className="font-medium text-navy-900">
                {formatDuration(selectedAttempt.duration_seconds || 0)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <FileCheck className="w-5 h-5 text-gold-500" />
            <div>
              <p className="text-sm text-gray-600">Tentativa</p>
              <p className="font-medium text-navy-900">
                {selectedAttempt.attempt_number} de {test.max_attempts || 3}
              </p>
            </div>
          </div>
        </div>

        {!canRetry && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Você atingiu o número máximo de tentativas
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Não é mais possível refazer este teste. Entre em contato com seu professor se precisar de ajuda.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Componente de Resultados */}
      <TestResults
        testId={test.id}
        attemptId={selectedAttempt.id}
        score={selectedAttempt.score || 0}
        passed={selectedAttempt.passed || false}
        correctCount={correctCount}
        totalQuestions={totalQuestions}
        passingScore={test.passing_score || 70}
        onRetry={canRetry ? () => router.push(`/student-dashboard/tests/${test.id}`) : undefined}
        onExit={() => router.push('/student-dashboard/tests')}
      />
    </div>
  )
}
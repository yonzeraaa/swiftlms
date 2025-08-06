'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Award,
  TrendingUp,
  RefreshCw,
  FileCheck
} from 'lucide-react'
import Card from '../../../../components/Card'
import Button from '../../../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { motion } from 'framer-motion'
import ProgressRing from '../../../../components/ui/ProgressRing'
import confetti from 'canvas-confetti'

type Test = Database['public']['Tables']['tests']['Row']
type Question = Database['public']['Tables']['questions']['Row']
type QuestionOption = Database['public']['Tables']['question_options']['Row']
type TestAttempt = Database['public']['Tables']['test_attempts']['Row']
type TestAnswer = Database['public']['Tables']['test_answers']['Row']

interface QuestionWithOptions extends Question {
  options: QuestionOption[]
}

interface TestResults {
  test: Test
  attempt: TestAttempt
  questions: QuestionWithOptions[]
  answers: TestAnswer[]
  score: number
  passed: boolean
  correctCount: number
  totalQuestions: number
  timeSpent: string
}

export default function TestResultsPage() {
  const params = useParams()
  const router = useRouter()
  const testId = params.id as string
  const supabase = createClient()

  const [results, setResults] = useState<TestResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAnswers, setShowAnswers] = useState(false)
  const [userAttempts, setUserAttempts] = useState(0)

  useEffect(() => {
    if (testId) {
      fetchResults()
    }
  }, [testId])

  const fetchResults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      // Fetch test
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single()

      if (testError || !testData) {
        router.push('/student-dashboard/assessments')
        return
      }

      // Fetch latest attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('test_id', testId)
        .eq('user_id', user.id)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single()

      if (attemptError || !attemptData || !attemptData.submitted_at) {
        router.push('/student-dashboard/assessments')
        return
      }

      // Fetch test questions with questions and options
      const { data: testQuestionsData } = await supabase
        .from('test_questions')
        .select('*')
        .eq('test_id', testId)
        .order('order_index')

      // Fetch questions and options
      const questions: QuestionWithOptions[] = []
      if (testQuestionsData && testQuestionsData.length > 0) {
        for (const tq of testQuestionsData) {
          // Fetch the actual question
          const { data: questionData } = await supabase
            .from('questions')
            .select('*')
            .eq('id', tq.question_id)
            .single()

          if (questionData) {
            // Fetch options for this question
            const { data: options } = await supabase
              .from('question_options')
              .select('*')
              .eq('question_id', questionData.id)
              .order('order_index')
            
            questions.push({
              ...questionData,
              options: options || []
            })
          }
        }
      }

      // Fetch user answers
      const { data: answersData } = await supabase
        .from('test_answers')
        .select('*')
        .eq('attempt_id', attemptData.id)

      const answers = answersData || []

      // Count user attempts for this test
      const { count: attemptsCount } = await supabase
        .from('test_attempts')
        .select('*', { count: 'exact' })
        .eq('test_id', testId)
        .eq('user_id', user.id)
        .not('submitted_at', 'is', null)

      setUserAttempts(attemptsCount || 0)

      // Calculate detailed results
      const score = attemptData.score || 0
      const passed = score >= (testData.passing_score || 60)
      let correctCount = 0

      questions.forEach(question => {
        const userAnswer = answers.find(a => a.question_id === question.id)
        const correctOptions = question.options.filter(opt => opt.is_correct)
        
        if (userAnswer && userAnswer.selected_option_id) {
          const selectedId = userAnswer.selected_option_id
          if (correctOptions.some(opt => opt.id === selectedId)) {
            correctCount++
          }
        }
      })

      // Format time spent
      const timeSpent = attemptData.time_spent_minutes 
        ? `${attemptData.time_spent_minutes} minutos`
        : 'Não registrado'

      setResults({
        test: testData,
        attempt: attemptData,
        questions,
        answers,
        score,
        passed,
        correctCount,
        totalQuestions: questions.length,
        timeSpent
      })

      // Show celebration if passed
      if (passed && score >= 80) {
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          })
        }, 500)
      }

    } catch (error) {
      console.error('Error fetching results:', error)
      router.push('/student-dashboard/assessments')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number, passingScore: number) => {
    if (score >= passingScore + 20) return 'text-green-400'
    if (score >= passingScore) return 'text-gold-400'
    return 'text-red-400'
  }

  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return { label: 'Excelente', color: 'text-green-400', icon: Trophy }
    if (score >= 80) return { label: 'Muito Bom', color: 'text-green-300', icon: Award }
    if (score >= 70) return { label: 'Bom', color: 'text-gold-400', icon: Target }
    if (score >= 60) return { label: 'Satisfatório', color: 'text-yellow-400', icon: CheckCircle2 }
    return { label: 'Insuficiente', color: 'text-red-400', icon: XCircle }
  }

  const handleRetryTest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Create new attempt
      const { error } = await supabase
        .from('test_attempts')
        .insert({
          test_id: testId,
          user_id: user.id,
          started_at: new Date().toISOString(),
          status: 'in_progress'
        })

      if (error) {
        console.error('Error creating new attempt:', error)
        return
      }

      // Redirect to test page
      router.push(`/student-dashboard/assessments/${testId}`)
    } catch (error) {
      console.error('Error retrying test:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <FileCheck className="w-16 h-16 text-gold-500/30 mb-4" />
        <h2 className="text-xl font-semibold text-gold-200 mb-2">Resultados não encontrados</h2>
        <Button onClick={() => router.push('/student-dashboard/assessments')}>
          Voltar às Avaliações
        </Button>
      </div>
    )
  }

  const performance = getPerformanceLevel(results.score)
  const PerformanceIcon = performance.icon

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/student-dashboard/assessments')}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gold">Resultados da Avaliação</h1>
          <p className="text-gold-300 mt-1">{results.test.title}</p>
        </div>
      </div>

      {/* Score Overview */}
      <Card variant="premium">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Header with Status */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <PerformanceIcon className={`w-8 h-8 ${performance.color}`} />
              <div>
                <h2 className="text-3xl font-bold text-gold">{results.score}%</h2>
                <p className={`text-lg font-medium ${performance.color}`}>
                  {performance.label}
                </p>
              </div>
            </div>
            
            <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg font-medium ${
              results.passed 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {results.passed ? (
                <>
                  <CheckCircle2 className="w-6 h-6" />
                  <span>Aprovado</span>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6" />
                  <span>Reprovado</span>
                </>
              )}
            </div>
          </div>

          {/* Visual Score Ring */}
          <div className="flex justify-center">
            <ProgressRing 
              value={results.score} 
              max={100}
              size={200}
              showValue={false}
              gradient={true}
              color={results.passed ? 'green' : 'red'}
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 bg-navy-800/30 rounded-xl border border-green-500/20">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-green-400 mb-1">{results.correctCount}</p>
              <p className="text-sm text-gold-300/70">Acertos</p>
            </div>
            
            <div className="text-center p-4 bg-navy-800/30 rounded-xl border border-red-500/20">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-2xl font-bold text-red-400 mb-1">
                {results.totalQuestions - results.correctCount}
              </p>
              <p className="text-sm text-gold-300/70">Erros</p>
            </div>
            
            <div className="text-center p-4 bg-navy-800/30 rounded-xl border border-gold-500/20">
              <div className="w-12 h-12 bg-gold-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileCheck className="w-6 h-6 text-gold-400" />
              </div>
              <p className="text-2xl font-bold text-gold-400 mb-1">{results.totalQuestions}</p>
              <p className="text-sm text-gold-300/70">Total de Questões</p>
            </div>
          </div>
        </motion.div>
      </Card>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="glass">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gold-500/20 rounded-full flex items-center justify-center">
              <Target className="w-6 h-6 text-gold-400" />
            </div>
            <div>
              <p className="text-sm text-gold-300/70">Taxa de Acertos</p>
              <p className="text-xl font-bold text-gold">
                {Math.round((results.correctCount / results.totalQuestions) * 100)}%
              </p>
            </div>
          </div>
        </Card>

        <Card variant="glass">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gold-300/70">Tempo Gasto</p>
              <p className="text-xl font-bold text-gold">{results.timeSpent}</p>
            </div>
          </div>
        </Card>

        <Card variant="glass">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gold-300/70">Nota Mínima</p>
              <p className="text-xl font-bold text-gold">{results.test.passing_score || 60}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Test Details */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gold">Detalhes da Avaliação</h3>
            {results.test.show_answers && (
              <Button
                variant="secondary"
                onClick={() => setShowAnswers(!showAnswers)}
              >
                {showAnswers ? 'Ocultar Respostas' : 'Ver Respostas'}
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gold-300/70">Concluído em:</span>
              <span className="ml-2 text-gold-200">
                {new Date(results.attempt.submitted_at!).toLocaleString('pt-BR')}
              </span>
            </div>
            <div>
              <span className="text-gold-300/70">Tipo:</span>
              <span className="ml-2 text-gold-200 capitalize">
                {results.test.test_type === 'quiz' ? 'Quiz' : 
                 results.test.test_type === 'exam' ? 'Prova' : 'Teste'}
              </span>
            </div>
            <div>
              <span className="text-gold-300/70">Tentativas permitidas:</span>
              <span className="ml-2 text-gold-200">
                {results.test.max_attempts || 'Ilimitadas'}
              </span>
            </div>
            <div>
              <span className="text-gold-300/70">Duração:</span>
              <span className="ml-2 text-gold-200">
                {results.test.duration_minutes ? `${results.test.duration_minutes} minutos` : 'Sem limite'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Question Review */}
      {showAnswers && results.test.show_answers && (
        <Card variant="glass">
          <h3 className="text-lg font-semibold text-gold mb-6">Revisão das Questões</h3>
          <div className="space-y-6">
            {results.questions.map((question, index) => {
              const userAnswer = results.answers.find(a => a.question_id === question.id)
              const correctOptions = question.options.filter(opt => opt.is_correct)
              const selectedId = userAnswer?.selected_option_id
              
              const isCorrect = selectedId ? correctOptions.some(opt => opt.id === selectedId) : false

              return (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border ${
                    isCorrect
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium text-gold-200 mb-2">
                        Questão {index + 1}: {question.question_text}
                      </h4>
                    </div>
                  </div>

                  <div className="space-y-2 ml-8">
                    {question.options.map((option) => {
                      const isSelected = selectedId === option.id
                      const isCorrectOption = option.is_correct

                      return (
                        <div
                          key={option.id}
                          className={`p-2 rounded text-sm ${
                            isCorrectOption
                              ? 'bg-green-500/20 text-green-300'
                              : isSelected
                              ? 'bg-red-500/20 text-red-300'
                              : 'text-gold-300/70'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isCorrectOption && (
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                            )}
                            {isSelected && !isCorrectOption && (
                              <XCircle className="w-4 h-4 text-red-400" />
                            )}
                            <span>{option.option_text}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Question Explanation */}
                  {question.explanation && (
                    <div className="ml-8 mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-blue-400 text-xs font-bold">?</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-300 mb-1">Explicação:</p>
                          <p className="text-sm text-blue-200">{question.explanation}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <div className="flex justify-center gap-4">
          <Button 
            variant="secondary"
            onClick={() => router.push('/student-dashboard/assessments')}
          >
            Voltar às Avaliações
          </Button>
          
          {!results.passed && 
           results.test.max_attempts !== 1 && 
           (results.test.max_attempts === null || userAttempts < results.test.max_attempts) && (
            <Button 
              variant="primary"
              onClick={handleRetryTest}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Tentar Novamente ({userAttempts}/{results.test.max_attempts || '∞'})
            </Button>
          )}
          
          {results.passed && (
            <Button 
              variant="primary"
              onClick={() => router.push('/student-dashboard/certificates')}
              icon={<Trophy className="w-4 h-4" />}
            >
              Ver Certificados
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
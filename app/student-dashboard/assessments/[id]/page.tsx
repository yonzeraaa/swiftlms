'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  Clock,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Save,
  Send,
  RefreshCw
} from 'lucide-react'
import Card from '../../../components/Card'
import Button from '../../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { motion, AnimatePresence } from 'framer-motion'

type Test = Database['public']['Tables']['tests']['Row']
type Question = Database['public']['Tables']['questions']['Row']
type QuestionOption = Database['public']['Tables']['question_options']['Row']
type TestAttempt = Database['public']['Tables']['test_attempts']['Row']

interface QuestionWithOptions extends Question {
  options: QuestionOption[]
}

interface TestWithDetails extends Test {
  questions: QuestionWithOptions[]
}

interface UserAnswers {
  [questionId: string]: string | string[] // string for single, string[] for multiple
}

export default function TakeTestPage() {
  const params = useParams()
  const router = useRouter()
  const testId = params.id as string
  const supabase = createClient()

  const [test, setTest] = useState<TestWithDetails | null>(null)
  const [attempt, setAttempt] = useState<TestAttempt | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null)

  useEffect(() => {
    if (testId) {
      fetchTestData()
    }
  }, [testId])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (timeLeft && timeLeft > 0 && !isSubmitting) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
        
        // Auto-submit when time runs out
        if (timeLeft === 1) {
          handleSubmitTest(true) // true = auto-submit
        }
      }, 1000)
    }
    return () => clearTimeout(timer)
  }, [timeLeft, isSubmitting])

  // Auto-save every 30 seconds
  useEffect(() => {
    const autoSaveTimer = setInterval(() => {
      if (Object.keys(userAnswers).length > 0) {
        saveProgress()
      }
    }, 30000)

    return () => clearInterval(autoSaveTimer)
  }, [userAnswers])

  const fetchTestData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      // Fetch test details
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .eq('is_published', true)
        .single()

      if (testError || !testData) {
        console.error('Test not found:', testError)
        router.push('/student-dashboard/assessments')
        return
      }

      // Check enrollment
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', testData.course_id!)
        .eq('user_id', user.id)
        .single()

      if (!enrollment) {
        router.push('/student-dashboard/assessments')
        return
      }

      // Fetch or create attempt
      let attemptData = null
      const { data: existingAttempt } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('test_id', testId)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .single()

      if (existingAttempt && !existingAttempt.submitted_at) {
        attemptData = existingAttempt
      } else if (!existingAttempt) {
        // Create new attempt
        const { data: newAttempt, error: attemptError } = await supabase
          .from('test_attempts')
          .insert({
            test_id: testId,
            user_id: user.id,
            started_at: new Date().toISOString()
          })
          .select()
          .single()

        if (attemptError) throw attemptError
        attemptData = newAttempt
      } else if (existingAttempt.submitted_at) {
        // Test already completed, redirect to results
        router.push(`/student-dashboard/assessments/${testId}/results`)
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


      // Load existing answers
      if (attemptData) {
        const { data: answersData } = await supabase
          .from('test_answers')
          .select('*')
          .eq('attempt_id', attemptData.id)

        if (answersData) {
          const answers: UserAnswers = {}
          answersData.forEach(answer => {
            if (answer.selected_option_id) {
              answers[answer.question_id] = answer.selected_option_id
            }
          })
          setUserAnswers(answers)
        }
      }

      // Calculate time left
      if (testData.duration_minutes && attemptData?.started_at) {
        const startTime = new Date(attemptData.started_at).getTime()
        const now = new Date().getTime()
        const elapsedMinutes = (now - startTime) / (1000 * 60)
        const remainingMinutes = Math.max(0, testData.duration_minutes - elapsedMinutes)
        setTimeLeft(Math.floor(remainingMinutes * 60))
      }

      setTest({ ...testData, questions })
      setAttempt(attemptData)

    } catch (error) {
      console.error('Error fetching test data:', error)
      router.push('/student-dashboard/assessments')
    } finally {
      setLoading(false)
    }
  }

  const saveProgress = async () => {
    if (!attempt) return
    
    setAutoSaveStatus('saving')
    try {
      // Save current answers
      for (const [questionId, answer] of Object.entries(userAnswers)) {
        const selectedId = Array.isArray(answer) ? answer[0] : answer
        
        await supabase
          .from('test_answers')
          .upsert({
            attempt_id: attempt.id,
            question_id: questionId,
            selected_option_id: selectedId
          })
      }

      setAutoSaveStatus('saved')
      setTimeout(() => setAutoSaveStatus(null), 2000)
    } catch (error) {
      console.error('Error saving progress:', error)
      setAutoSaveStatus('error')
      setTimeout(() => setAutoSaveStatus(null), 3000)
    }
  }

  const handleAnswerChange = (questionId: string, optionId: string, _isMultiple: boolean) => {
    setUserAnswers(prev => {
      return { ...prev, [questionId]: optionId }
    })
  }

  const handleSubmitTest = async (isAutoSubmit = false) => {
    if (!attempt || !test) return

    setIsSubmitting(true)
    try {
      // Save final answers
      await saveProgress()

      // Calculate score
      let correctAnswers = 0
      let totalQuestions = test.questions.length

      for (const question of test.questions) {
        const userAnswer = userAnswers[question.id]
        const correctOptions = question.options.filter(opt => opt.is_correct)
        
        const selectedId = Array.isArray(userAnswer) ? userAnswer[0] : userAnswer
        if (selectedId && correctOptions.some(opt => opt.id === selectedId)) {
          correctAnswers++
        }
      }

      const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

      // Update attempt
      const { error: updateError } = await supabase
        .from('test_attempts')
        .update({
          submitted_at: new Date().toISOString(),
          score: score,
          status: 'completed' as Database['public']['Enums']['attempt_status'],
          time_spent_minutes: test.duration_minutes ? Math.round(test.duration_minutes - ((timeLeft || 0) / 60)) : null
        })
        .eq('id', attempt.id)

      if (updateError) {
        throw updateError
      }

      // Add small delay to ensure database is updated
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Redirect to results
      router.push(`/student-dashboard/assessments/${testId}/results`)

    } catch (error) {
      console.error('Error submitting test:', error)
      setIsSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getAnsweredCount = () => {
    return Object.keys(userAnswers).length
  }

  const isTimeRunningOut = timeLeft !== null && timeLeft < 300 // Less than 5 minutes

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    )
  }

  if (!test) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <FileCheck className="w-16 h-16 text-gold-500/30 mb-4" />
        <h2 className="text-xl font-semibold text-gold-200 mb-2">Avaliação não encontrada</h2>
        <Button onClick={() => router.push('/student-dashboard/assessments')}>
          Voltar às Avaliações
        </Button>
      </div>
    )
  }

  const question = test.questions[currentQuestion]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Timer */}
      <Card variant="premium">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/student-dashboard/assessments')}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gold">{test.title}</h1>
              <p className="text-gold-300/70">
                Questão {currentQuestion + 1} de {test.questions.length}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Auto-save Status */}
            <AnimatePresence>
              {autoSaveStatus && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2"
                >
                  {autoSaveStatus === 'saving' && (
                    <>
                      <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                      <span className="text-sm text-blue-400">Salvando...</span>
                    </>
                  )}
                  {autoSaveStatus === 'saved' && (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400">Salvo</span>
                    </>
                  )}
                  {autoSaveStatus === 'error' && (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-red-400">Erro ao salvar</span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Timer */}
            {timeLeft !== null && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                isTimeRunningOut 
                  ? 'bg-red-500/20 text-red-400' 
                  : 'bg-navy-800/50 text-gold-300'
              }`}>
                <Clock className="w-4 h-4" />
                <span className="font-mono font-medium">
                  {formatTime(timeLeft)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Progress Bar */}
      <div className="w-full bg-navy-800 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-gold-500 to-gold-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${((currentQuestion + 1) / test.questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      {question && (
        <Card variant="glass" className="min-h-[400px]">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gold mb-4">
                {question.question_text}
              </h2>
            </div>

            <div className="space-y-3">
              {question.options.map((option, index) => {
                const isSelected = userAnswers[question.id] === option.id

                return (
                  <motion.label
                    key={option.id}
                    className={`
                      block p-4 rounded-lg border cursor-pointer transition-all
                      ${isSelected 
                        ? 'bg-gold-500/20 border-gold-500/50 text-gold-200' 
                        : 'bg-navy-800/30 border-gold-500/20 hover:bg-navy-800/50 text-gold-300'
                      }
                    `}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option.id}
                        checked={isSelected}
                        onChange={() => handleAnswerChange(
                          question.id, 
                          option.id, 
                          false
                        )}
                        className="w-4 h-4 text-gold-500 bg-navy-800 border-gold-500/50 focus:ring-gold-500"
                      />
                      <span className="flex-1">{option.option_text}</span>
                    </div>
                  </motion.label>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Navigation and Submit */}
      <Card>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              onClick={() => setCurrentQuestion(Math.min(test.questions.length - 1, currentQuestion + 1))}
              disabled={currentQuestion === test.questions.length - 1}
            >
              Próxima
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gold-300">
              {getAnsweredCount()} de {test.questions.length} respondidas
            </div>
            
            <Button
              variant="secondary"
              onClick={saveProgress}
              icon={<Save className="w-4 h-4" />}
              disabled={Object.keys(userAnswers).length === 0}
            >
              Salvar Progresso
            </Button>
            
            <Button
              variant="primary"
              onClick={() => setShowConfirmSubmit(true)}
              icon={<Send className="w-4 h-4" />}
              disabled={isSubmitting || Object.keys(userAnswers).length === 0}
            >
              Finalizar Avaliação
            </Button>
          </div>
        </div>
      </Card>

      {/* Confirm Submit Modal */}
      <AnimatePresence>
        {showConfirmSubmit && (
          <div className="fixed inset-0 bg-navy-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-navy-800 rounded-2xl max-w-md w-full p-6 border border-gold-500/20"
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-semibold text-gold">Finalizar Avaliação</h3>
              </div>
              
              <div className="space-y-4 mb-6">
                <p className="text-gold-300">
                  Tem certeza que deseja finalizar esta avaliação? 
                </p>
                <div className="bg-navy-900/50 p-3 rounded-lg">
                  <p className="text-sm text-gold-300/70">
                    • Questões respondidas: {getAnsweredCount()} de {test.questions.length}
                  </p>
                  <p className="text-sm text-gold-300/70">
                    • Questões não respondidas: {test.questions.length - getAnsweredCount()}
                  </p>
                  {timeLeft && (
                    <p className="text-sm text-gold-300/70">
                      • Tempo restante: {formatTime(timeLeft)}
                    </p>
                  )}
                  <p className="text-sm text-blue-300 mt-2">
                    • Suas respostas serão salvas automaticamente
                  </p>
                </div>
                {getAnsweredCount() === 0 && (
                  <p className="text-sm text-red-300">
                    ⚠️ Você não respondeu nenhuma questão. Tem certeza?
                  </p>
                )}
                <p className="text-sm text-yellow-300">
                  Esta ação não pode ser desfeita.
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowConfirmSubmit(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => handleSubmitTest()}
                  disabled={isSubmitting}
                  icon={isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                >
                  {isSubmitting ? 'Enviando...' : 'Finalizar'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Time Warning */}
      <AnimatePresence>
        {isTimeRunningOut && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 bg-red-500/20 border border-red-500/50 rounded-lg p-4 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-400">Tempo esgotando!</p>
                <p className="text-xs text-red-300">Menos de 5 minutos restantes</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
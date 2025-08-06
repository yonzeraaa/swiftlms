'use client'

import { useState, useEffect } from 'react'
import { Eye, Clock, Users, Award, FileCheck, BarChart3, Calendar, Settings, Check, X } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'
import { createClient } from '@/lib/supabase/client'
import { useToast } from './Toast'

interface TestPreviewProps {
  isOpen: boolean
  onClose: () => void
  testId: string
}

interface TestData {
  id: string
  title: string
  description?: string
  test_type: 'quiz' | 'exam' | 'practice'
  duration_minutes?: number
  total_points: number
  passing_score: number
  instructions?: string
  is_published: boolean
  show_results: boolean
  show_answers: boolean
  randomize_questions: boolean
  randomize_options: boolean
  max_attempts?: number
  scheduled_for?: string
  available_until?: string
  created_at: string
  updated_at: string
  course?: { title: string }
  subject?: { name: string }
  creator?: { full_name: string }
  questions?: Array<{
    question: {
      id: string
      question_text: string
      question_type: string
      difficulty: string
      points: number
      explanation?: string
      options?: Array<{
        id: string
        option_text: string
        is_correct: boolean
        order_index: number
      }>
    }
    order_index: number
    points_override?: number
  }>
  attempts?: Array<{
    id: string
    user_id: string
    score: number
    status: string
    started_at: string
    submitted_at?: string
    user?: { full_name: string; email: string }
  }>
}

export default function TestPreview({ isOpen, onClose, testId }: TestPreviewProps) {
  const [loading, setLoading] = useState(true)
  const [testData, setTestData] = useState<TestData | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'questions' | 'statistics'>('details')
  const { showToast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (isOpen && testId) {
      fetchTestData()
    }
  }, [isOpen, testId])

  const fetchTestData = async () => {
    setLoading(true)
    try {
      // Fetch test details
      const { data: test, error: testError } = await supabase
        .from('tests')
        .select(`
          *,
          course:courses(title),
          subject:subjects(name),
          creator:profiles!tests_created_by_fkey(full_name)
        `)
        .eq('id', testId)
        .single()

      if (testError) throw testError

      // Fetch test questions with details
      const { data: questions, error: questionsError } = await supabase
        .from('test_questions')
        .select(`
          *,
          question:questions(
            *,
            options:question_options(*)
          )
        `)
        .eq('test_id', testId)
        .order('order_index')

      if (questionsError) throw questionsError

      // Fetch test attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from('test_attempts')
        .select(`
          *,
          user:profiles!test_attempts_user_id_fkey(full_name, email)
        `)
        .eq('test_id', testId)
        .order('started_at', { ascending: false })

      if (attemptsError) throw attemptsError

      setTestData({
        ...test,
        questions,
        attempts
      } as TestData)
    } catch (error) {
      console.error('Error fetching test data:', error)
      showToast({ type: 'error', title: 'Erro ao carregar dados do teste' })
    } finally {
      setLoading(false)
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'quiz': return 'Quiz'
      case 'exam': return 'Prova'
      case 'practice': return 'Prática'
      default: return type
    }
  }

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice': return 'Múltipla Escolha'
      case 'true_false': return 'Verdadeiro ou Falso'
      case 'essay': return 'Dissertativa'
      case 'fill_blank': return 'Preencher Lacunas'
      default: return type
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Fácil'
      case 'medium': return 'Médio'
      case 'hard': return 'Difícil'
      default: return difficulty
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400'
      case 'medium': return 'text-yellow-400'
      case 'hard': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const calculateStatistics = () => {
    if (!testData?.attempts || testData.attempts.length === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        completionRate: 0,
        highestScore: 0,
        lowestScore: 0
      }
    }

    const completedAttempts = testData.attempts.filter(a => a.status === 'completed')
    const scores = completedAttempts.map(a => a.score || 0)
    const passedAttempts = completedAttempts.filter(a => (a.score || 0) >= testData.passing_score)

    return {
      totalAttempts: testData.attempts.length,
      averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      passRate: completedAttempts.length > 0 ? (passedAttempts.length / completedAttempts.length) * 100 : 0,
      completionRate: testData.attempts.length > 0 ? (completedAttempts.length / testData.attempts.length) * 100 : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0
    }
  }

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Carregando..." size="xl">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
        </div>
      </Modal>
    )
  }

  if (!testData) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Erro" size="xl">
        <div className="text-center py-8">
          <p className="text-gold-300">Não foi possível carregar os dados do teste.</p>
        </div>
      </Modal>
    )
  }

  const stats = calculateStatistics()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={testData.title} size="xl">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-gold-500/20">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'details'
                ? 'text-gold border-b-2 border-gold'
                : 'text-gold-400 hover:text-gold-200'
            }`}
          >
            Detalhes
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'questions'
                ? 'text-gold border-b-2 border-gold'
                : 'text-gold-400 hover:text-gold-200'
            }`}
          >
            Questões ({testData.questions?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'statistics'
                ? 'text-gold border-b-2 border-gold'
                : 'text-gold-400 hover:text-gold-200'
            }`}
          >
            Estatísticas
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                testData.is_published
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {testData.is_published ? 'Publicado' : 'Rascunho'}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                testData.test_type === 'quiz'
                  ? 'bg-blue-500/20 text-blue-400'
                  : testData.test_type === 'exam'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-orange-500/20 text-orange-400'
              }`}>
                {getTypeLabel(testData.test_type)}
              </span>
            </div>

            {/* Description */}
            {testData.description && (
              <div>
                <h3 className="text-sm font-medium text-gold-300 mb-2">Descrição</h3>
                <p className="text-gold-100">{testData.description}</p>
              </div>
            )}

            {/* Basic Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              {testData.course && (
                <div>
                  <span className="text-sm text-gold-400">Curso:</span>
                  <p className="text-gold-100 font-medium">{testData.course.title}</p>
                </div>
              )}
              {testData.subject && (
                <div>
                  <span className="text-sm text-gold-400">Disciplina:</span>
                  <p className="text-gold-100 font-medium">{testData.subject.name}</p>
                </div>
              )}
              <div>
                <span className="text-sm text-gold-400">Duração:</span>
                <p className="text-gold-100 font-medium">
                  {testData.duration_minutes ? `${testData.duration_minutes} minutos` : 'Sem limite'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gold-400">Total de Pontos:</span>
                <p className="text-gold-100 font-medium">{testData.total_points}</p>
              </div>
              <div>
                <span className="text-sm text-gold-400">Nota Mínima:</span>
                <p className="text-gold-100 font-medium">{testData.passing_score}%</p>
              </div>
              <div>
                <span className="text-sm text-gold-400">Tentativas Máximas:</span>
                <p className="text-gold-100 font-medium">
                  {testData.max_attempts || 'Ilimitado'}
                </p>
              </div>
            </div>

            {/* Instructions */}
            {testData.instructions && (
              <div>
                <h3 className="text-sm font-medium text-gold-300 mb-2">Instruções</h3>
                <p className="text-gold-100 whitespace-pre-wrap">{testData.instructions}</p>
              </div>
            )}

            {/* Settings */}
            <div>
              <h3 className="text-sm font-medium text-gold-300 mb-3">Configurações</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {testData.show_results ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-gold-100 text-sm">Mostrar resultados após conclusão</span>
                </div>
                <div className="flex items-center gap-2">
                  {testData.show_answers ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-gold-100 text-sm">Mostrar respostas corretas</span>
                </div>
                <div className="flex items-center gap-2">
                  {testData.randomize_questions ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-gold-100 text-sm">Randomizar questões</span>
                </div>
                <div className="flex items-center gap-2">
                  {testData.randomize_options ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-gold-100 text-sm">Randomizar opções</span>
                </div>
              </div>
            </div>

            {/* Schedule */}
            {(testData.scheduled_for || testData.available_until) && (
              <div>
                <h3 className="text-sm font-medium text-gold-300 mb-3">Agendamento</h3>
                <div className="space-y-2">
                  {testData.scheduled_for && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gold-400" />
                      <span className="text-gold-100 text-sm">
                        Disponível a partir de: {new Date(testData.scheduled_for).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                  {testData.available_until && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gold-400" />
                      <span className="text-gold-100 text-sm">
                        Disponível até: {new Date(testData.available_until).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t border-gold-500/20">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {testData.creator && (
                  <div>
                    <span className="text-gold-400">Criado por:</span>
                    <span className="text-gold-100 ml-2">{testData.creator.full_name}</span>
                  </div>
                )}
                <div>
                  <span className="text-gold-400">Criado em:</span>
                  <span className="text-gold-100 ml-2">
                    {new Date(testData.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-gold-400">Última atualização:</span>
                  <span className="text-gold-100 ml-2">
                    {new Date(testData.updated_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-4">
            {testData.questions && testData.questions.length > 0 ? (
              testData.questions.map((item, index) => (
                <div key={item.question.id} className="p-4 bg-navy-900/30 rounded-lg border border-gold-500/10">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gold-500/20 text-gold rounded-full text-sm font-medium">
                      {index + 1}
                    </span>
                    <div className="flex-1 space-y-3">
                      <p className="text-gold-100">{item.question.question_text}</p>
                      
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-navy-700/50 text-gold-300">
                          {getQuestionTypeLabel(item.question.question_type)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium bg-navy-700/50 ${getDifficultyColor(item.question.difficulty)}`}>
                          {getDifficultyLabel(item.question.difficulty)}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-navy-700/50 text-gold-300">
                          {item.points_override || item.question.points} pontos
                        </span>
                      </div>

                      {item.question.options && item.question.options.length > 0 && (
                        <div className="space-y-2 mt-3">
                          {item.question.options
                            .sort((a, b) => a.order_index - b.order_index)
                            .map((option, optIndex) => (
                              <div
                                key={option.id}
                                className={`flex items-center gap-2 p-2 rounded ${
                                  option.is_correct
                                    ? 'bg-green-500/10 border border-green-500/20'
                                    : 'bg-navy-800/30'
                                }`}
                              >
                                <span className="text-gold-400 text-sm">
                                  {String.fromCharCode(65 + optIndex)})
                                </span>
                                <span className="text-gold-100 text-sm">{option.option_text}</span>
                                {option.is_correct && (
                                  <Check className="w-4 h-4 text-green-400 ml-auto" />
                                )}
                              </div>
                            ))}
                        </div>
                      )}

                      {item.question.explanation && (
                        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                          <p className="text-sm text-gold-300">
                            <strong>Explicação:</strong> {item.question.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gold-400">Nenhuma questão adicionada ao teste.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'statistics' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-navy-900/30 rounded-lg border border-gold-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-gold-400" />
                  <span className="text-sm text-gold-300">Total de Tentativas</span>
                </div>
                <p className="text-2xl font-bold text-gold">{stats.totalAttempts}</p>
              </div>

              <div className="p-4 bg-navy-900/30 rounded-lg border border-gold-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-gold-400" />
                  <span className="text-sm text-gold-300">Média Geral</span>
                </div>
                <p className="text-2xl font-bold text-gold">
                  {stats.averageScore.toFixed(1)}%
                </p>
              </div>

              <div className="p-4 bg-navy-900/30 rounded-lg border border-gold-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-gold-400" />
                  <span className="text-sm text-gold-300">Taxa de Aprovação</span>
                </div>
                <p className="text-2xl font-bold text-gold">
                  {stats.passRate.toFixed(1)}%
                </p>
              </div>

              <div className="p-4 bg-navy-900/30 rounded-lg border border-gold-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck className="w-5 h-5 text-gold-400" />
                  <span className="text-sm text-gold-300">Taxa de Conclusão</span>
                </div>
                <p className="text-2xl font-bold text-gold">
                  {stats.completionRate.toFixed(1)}%
                </p>
              </div>

              <div className="p-4 bg-navy-900/30 rounded-lg border border-gold-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gold-300">Maior Pontuação</span>
                </div>
                <p className="text-2xl font-bold text-green-400">
                  {stats.highestScore.toFixed(1)}%
                </p>
              </div>

              <div className="p-4 bg-navy-900/30 rounded-lg border border-gold-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gold-300">Menor Pontuação</span>
                </div>
                <p className="text-2xl font-bold text-red-400">
                  {stats.lowestScore.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Recent Attempts */}
            <div>
              <h3 className="text-sm font-medium text-gold-300 mb-3">Tentativas Recentes</h3>
              {testData.attempts && testData.attempts.length > 0 ? (
                <div className="space-y-2">
                  {testData.attempts.slice(0, 10).map((attempt) => (
                    <div key={attempt.id} className="p-3 bg-navy-900/30 rounded-lg border border-gold-500/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gold-100 font-medium">
                            {attempt.user?.full_name || attempt.user?.email || 'Usuário'}
                          </p>
                          <p className="text-gold-400 text-sm">
                            {new Date(attempt.started_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            (attempt.score || 0) >= testData.passing_score
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}>
                            {attempt.score?.toFixed(1) || 0}%
                          </p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            attempt.status === 'completed'
                              ? 'bg-green-500/20 text-green-400'
                              : attempt.status === 'in_progress'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {attempt.status === 'completed' ? 'Concluído' : 
                             attempt.status === 'in_progress' ? 'Em andamento' : 'Abandonado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gold-400">Nenhuma tentativa registrada ainda.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
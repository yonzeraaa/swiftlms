'use client'

import { useState, useEffect } from 'react'
import DocumentViewer from './DocumentViewer'
import TestAnswerPanel from './TestAnswerPanel'
import { Tables } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/client'
import { Clock, AlertCircle, FileText, Settings } from 'lucide-react'
import Card from './Card'
import Button from './Button'
import { useTranslation } from '@/app/contexts/LanguageContext'

type Test = Tables<'tests'>

interface TestViewerProps {
  test: Test
  enrollmentId: string
  onComplete?: (attemptId: string, score: number, passed: boolean) => void
}

export default function TestViewer({ test, enrollmentId, onComplete }: TestViewerProps) {
  const [showAnswerPanel, setShowAnswerPanel] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [questionCount, setQuestionCount] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [startTime] = useState(new Date())
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [showQuestionConfig, setShowQuestionConfig] = useState(false)
  const [manualQuestionCount, setManualQuestionCount] = useState('20')
  
  const supabase = createClient()
  const { t } = useTranslation()

  useEffect(() => {
    loadQuestionCount()
    loadSavedAnswers()
    
    if (test.duration_minutes) {
      setTimeRemaining(test.duration_minutes * 60) // converter para segundos
    }
  }, [test])

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev && prev <= 1) {
          handleSubmit() // Auto-submit quando o tempo acabar
          return 0
        }
        return prev ? prev - 1 : null
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining])

  const loadQuestionCount = async () => {
    setLoadingQuestions(true)
    try {
      // Primeiro tenta buscar do gabarito cadastrado
      const { data, error } = await supabase
        .from('test_answer_keys')
        .select('question_number')
        .eq('test_id', test.id)
        .order('question_number', { ascending: false })
        .limit(1)
        .single()
      
      if (data && !error) {
        setQuestionCount(data.question_number)
        console.log('Número de questões carregado do gabarito:', data.question_number)
      } else {
        // Se não houver gabarito, usa um padrão
        // O aluno nunca deve ver mensagem sobre gabarito não cadastrado
        const defaultCount = 20
        setQuestionCount(defaultCount)
        console.log('Usando número padrão de questões:', defaultCount)
      }
    } catch (error) {
      console.error('Erro ao carregar número de questões:', error)
      // Em caso de erro, usa um valor padrão
      const defaultCount = 20
      setQuestionCount(defaultCount)
    } finally {
      setLoadingQuestions(false)
    }
  }

  const handleSetQuestionCount = () => {
    const count = parseInt(manualQuestionCount)
    if (count > 0 && count <= 100) {
      setQuestionCount(count)
      localStorage.setItem(`test_question_count_${test.id}`, count.toString())
      setShowQuestionConfig(false)
    } else {
      alert('Por favor, insira um número entre 1 e 100')
    }
  }

  const loadSavedAnswers = () => {
    // Carregar respostas salvas do localStorage
    const saved = localStorage.getItem(`test_answers_${test.id}`)
    if (saved) {
      try {
        setAnswers(JSON.parse(saved))
      } catch (e) {
        console.error('Erro ao carregar respostas salvas:', e)
      }
    }
  }

  const handleAnswerChange = (questionNumber: number, answer: string) => {
    const newAnswers = {
      ...answers,
      [questionNumber]: answer
    }
    setAnswers(newAnswers)
    
    // Salvar no localStorage
    localStorage.setItem(`test_answers_${test.id}`, JSON.stringify(newAnswers))
  }

  const handleSubmit = async () => {
    if (submitting || submitted) return
    
    const answeredCount = Object.keys(answers).length
    if (answeredCount < questionCount) {
      if (!confirm(`Você respondeu apenas ${answeredCount} de ${questionCount} questões. Deseja enviar mesmo assim?`)) {
        return
      }
    }

    setSubmitting(true)
    
    try {
      const response = await fetch(`/api/tests/${test.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      })

      const result = await response.json()
      
      if (result.success) {
        setSubmitted(true)
        
        // Limpar respostas salvas
        localStorage.removeItem(`test_answers_${test.id}`)
        
        // Chamar callback com resultado
        if (onComplete) {
          onComplete(result.attempt.id, result.attempt.score, result.attempt.passed)
        }
      } else {
        alert(result.error || 'Erro ao enviar teste')
      }
    } catch (error) {
      console.error('Erro ao enviar:', error)
      alert('Erro ao enviar teste')
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-screen bg-navy-900 flex flex-col">
      {/* Header com informações do teste */}
      <div className="bg-gradient-to-r from-navy-800 to-navy-900 border-b border-gold-500/30 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-gold-500/30 to-gold-600/20 rounded-lg border border-gold-500/30">
              <FileText className="w-6 h-6 text-gold" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gold">
                {test.title}
              </h1>
              {test.description && (
                <p className="text-gold-300/80 mt-1">{test.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {timeRemaining !== null && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                timeRemaining < 300 
                  ? 'bg-red-900/30 text-red-400 border-red-500/50 animate-pulse' 
                  : 'bg-navy-900/50 text-gold-300 border-gold-500/30'
              }`}>
                <Clock className="w-5 h-5" />
                <span className="font-medium">{formatTime(timeRemaining)}</span>
              </div>
            )}
            
            {!showAnswerPanel && !submitted && (
              <Button
                variant="primary"
                onClick={() => setShowAnswerPanel(true)}
                icon={<FileText className="w-4 h-4" />}
                iconPosition="left"
                disabled={questionCount === 0 && !showQuestionConfig}
              >
                Responder Teste
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de configuração de questões */}
      {showQuestionConfig && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
          <Card variant="elevated" className="max-w-md border-2 border-gold-500 shadow-2xl shadow-gold-500/20">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-gold-500/30 to-gold-600/20 rounded-lg border border-gold-500/30">
                  <Settings className="w-6 h-6 text-gold" />
                </div>
                <h2 className="text-xl font-bold text-gold">Configurar Teste</h2>
              </div>
              
              <p className="text-gold-300 mb-4">
                Por favor, confirme o número de questões do teste:
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  Número de Questões
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={manualQuestionCount}
                  onChange={(e) => setManualQuestionCount(e.target.value)}
                  className="w-full px-4 py-2 bg-navy-800 border border-gold-500/30 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Ex: 20"
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={handleSetQuestionCount}
                  className="flex-1"
                >
                  Confirmar
                </Button>
              </div>
              
              <p className="text-xs text-gold-400/60 mt-3 text-center">
                Esta configuração será salva para próximas tentativas
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Área principal com documento e painel de respostas */}
      <div className="flex-1 flex overflow-hidden bg-navy-900">
        {/* Visualizador de documento */}
        <div className={`transition-all duration-300 ${
          showAnswerPanel && !submitted ? 'w-full lg:w-[70%]' : 'w-full'
        }`}>
          <div className="h-full p-4">
            <Card variant="elevated" className="h-full border border-gold-500/30">
              <DocumentViewer 
                url={test.google_drive_url}
                title={test.title}
              />
            </Card>
          </div>
        </div>

        {/* Painel de respostas */}
        {!submitted && (
          <TestAnswerPanel
            testId={test.id}
            isOpen={showAnswerPanel}
            onToggle={() => setShowAnswerPanel(!showAnswerPanel)}
            answers={answers}
            onAnswerChange={handleAnswerChange}
            onSubmit={handleSubmit}
            questionCount={questionCount}
            submitting={submitting}
          />
        )}
      </div>

      {/* Mensagem de teste enviado */}
      {submitted && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
          <Card variant="gradient" className="max-w-md text-center transform animate-scale-in border-2 border-gold-500 shadow-2xl shadow-gold-500/20">
            <div className="p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500/30 to-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/50">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gold mb-2">Teste Enviado!</h2>
              <p className="text-gold-300">
                Suas respostas foram registradas com sucesso.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { X, Send, CheckCircle, Circle, FileText } from 'lucide-react'
import QuestionGrid from './QuestionGrid'
import Button from './Button'
import { useTranslation } from '@/app/contexts/LanguageContext'

interface TestAnswerPanelProps {
  testId: string
  isOpen: boolean
  onToggle: () => void
  answers: Record<string, string>
  onAnswerChange: (questionNumber: number, answer: string) => void
  onSubmit: () => void
  questionCount: number
  submitting?: boolean
}

export default function TestAnswerPanel({
  testId,
  isOpen,
  onToggle,
  answers,
  onAnswerChange,
  onSubmit,
  questionCount,
  submitting = false
}: TestAnswerPanelProps) {
  const [isMobile, setIsMobile] = useState(false)
  const { t } = useTranslation()
  const answeredCount = Object.keys(answers).length
  const progress = questionCount > 0 ? (answeredCount / questionCount) * 100 : 0

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isMobile) {
    // Versão mobile: botão flutuante + drawer
    return (
      <>
        {/* Botão flutuante */}
        <button
          onClick={onToggle}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-gold-500 to-gold-600 text-navy-900 rounded-full p-4 shadow-lg hover:shadow-gold-500/30 transition-all hover:scale-110 border border-gold-400"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <span className="font-bold">{t('test.answers')}</span>
            <span className="bg-navy-900/20 px-2 py-0.5 rounded-full text-sm font-medium">
              {answeredCount}/{questionCount}
            </span>
          </div>
        </button>

        {/* Drawer deslizante */}
        {isOpen && (
          <>
            {/* Overlay */}
            <div
              onClick={onToggle}
              className="fixed inset-0 bg-black/70 z-40 animate-fade-in"
            />
            
            {/* Painel */}
            <div className="fixed inset-x-0 bottom-0 z-50 bg-gradient-to-br from-navy-800 to-navy-900 rounded-t-2xl max-h-[80vh] overflow-hidden shadow-2xl border-t-2 border-gold-500 animate-slide-up">
              <div className="p-4 border-b border-gold-500/30 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gold">{t('test.answerSheet')}</h3>
                <button
                  onClick={onToggle}
                  className="p-2 hover:bg-navy-700/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gold-300" />
                </button>
              </div>
                
              <div className="p-4 overflow-y-auto max-h-[60vh] bg-navy-900">
                <QuestionGrid
                  questionCount={questionCount}
                  answers={answers}
                  onChange={onAnswerChange}
                />
                
                <Button
                  variant="primary"
                  onClick={onSubmit}
                  disabled={submitting || answeredCount === 0}
                  className="w-full mt-6"
                  icon={!submitting ? <Send className="w-5 h-5" /> : undefined}
                  iconPosition="left"
                >
                  {submitting ? 'Enviando...' : 'Enviar Respostas'}
                </Button>
              </div>
            </div>
          </>
        )}
      </>
    )
  }

  // Versão desktop: painel lateral fixo
  return (
    <>
      {isOpen && (
        <div
          className="w-[30%] border-l-2 border-gold-500 bg-gradient-to-br from-navy-800 to-navy-900 overflow-hidden transition-all duration-300 animate-fade-in"
        >
          <div className="h-full flex flex-col">
            {/* Header do painel */}
            <div className="p-4 border-b border-gold-500/30 bg-navy-900/50">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gold-400" />
                  {t('test.answerSheet')}
                </h3>
                <button
                  onClick={onToggle}
                  className="p-1 hover:bg-navy-700/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gold-300" />
                </button>
              </div>
              
              {/* Barra de progresso */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gold-300">
                  <span>{t('test.progress')}</span>
                  <span className="font-medium">{answeredCount} {t('common.of')} {questionCount} {t('test.questions')}</span>
                </div>
                <div className="w-full bg-navy-700 rounded-full h-2 border border-gold-500/20">
                  <div
                    className="bg-gradient-to-r from-gold-500 to-gold-600 h-2 rounded-full transition-all duration-300 shadow-lg shadow-gold-500/30"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Grid de questões */}
            <div className="flex-1 overflow-y-auto p-4 bg-navy-900">
              <QuestionGrid
                questionCount={questionCount}
                answers={answers}
                onChange={onAnswerChange}
              />
            </div>

            {/* Botão de enviar */}
            <div className="p-4 border-t border-gold-500/30 bg-navy-900/50">
              <Button
                variant="primary"
                onClick={onSubmit}
                disabled={submitting || answeredCount === 0}
                className="w-full"
                size="lg"
                icon={!submitting ? <Send className="w-5 h-5" /> : undefined}
                iconPosition="left"
              >
                {submitting ? 'Enviando...' : 'Enviar Respostas'}
              </Button>
              
              {answeredCount === 0 && (
                <p className="text-xs text-gold-400/60 mt-2 text-center">
                  {t('test.answerAtLeastOne')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
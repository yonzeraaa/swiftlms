'use client'

import { CheckCircle, Circle } from 'lucide-react'
import { useTranslation } from '@/app/contexts/LanguageContext'

interface QuestionGridProps {
  questionCount: number
  answers: Record<string, string>
  onChange: (questionNumber: number, answer: string) => void
}

export default function QuestionGrid({ questionCount, answers, onChange }: QuestionGridProps) {
  const options = ['A', 'B', 'C', 'D', 'E']
  const { t } = useTranslation()
  
  return (
    <div className="space-y-4">
      {[...Array(questionCount)].map((_, index) => {
        const questionNumber = index + 1
        const currentAnswer = answers[questionNumber]
        const isAnswered = !!currentAnswer
        
        return (
          <div
            key={questionNumber}
            className={`
              border-2 rounded-lg p-3 transition-all animate-fade-in
              ${isAnswered 
                ? 'border-gold-500 bg-navy-800/50' 
                : 'border-gold-500/30 bg-navy-800/30'
              }
            `}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gold">
                  {t('test.question')} {questionNumber}
                </span>
                {isAnswered ? (
                  <CheckCircle className="w-4 h-4 text-gold-400" />
                ) : (
                  <Circle className="w-4 h-4 text-gold-500/50" />
                )}
              </div>
              {isAnswered && (
                <span className="text-xs px-2 py-1 bg-gold-500/20 text-gold-300 rounded-full border border-gold-500/30">
                  {t('test.answered')}: {currentAnswer}
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              {options.map(option => (
                <label
                  key={option}
                  className="flex-1 relative cursor-pointer group"
                >
                  <input
                    type="radio"
                    name={`question-${questionNumber}`}
                    value={option}
                    checked={currentAnswer === option}
                    onChange={() => onChange(questionNumber, option)}
                    className="sr-only"
                  />
                  <div className={`
                    text-center py-2 px-3 rounded-lg border-2 transition-all
                    ${currentAnswer === option
                      ? 'border-gold-400 bg-gradient-to-r from-gold-500 to-gold-600 text-navy-900 font-bold shadow-lg shadow-gold-500/30'
                      : 'border-gold-500/30 bg-navy-700/50 text-gold-300 hover:border-gold-400 hover:bg-navy-700 hover:text-gold'
                    }
                  `}>
                    {option}
                  </div>
                  {currentAnswer === option && (
                    <div className="absolute inset-0 border-2 border-gold-400 rounded-lg pointer-events-none animate-pulse" />
                  )}
                </label>
              ))}
            </div>
          </div>
        )
      })}
      
      {questionCount === 0 && (
        <div className="text-center py-8 text-gold-400">
          <p>{t('test.loadingQuestions')}</p>
        </div>
      )}
    </div>
  )
}
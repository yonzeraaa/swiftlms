'use client'

import { motion } from 'framer-motion'
import { Trophy, XCircle, CheckCircle, RefreshCw, Home, TrendingUp, Eye, EyeOff } from 'lucide-react'
import confetti from 'canvas-confetti'
import { useEffect, useState } from 'react'

interface QuestionDetail {
  questionNumber: number
  correctAnswer: string
  studentAnswer: string | null
  isCorrect: boolean
}

interface TestResultsProps {
  testId: string
  attemptId: string
  score: number
  passed: boolean
  correctCount: number
  totalQuestions: number
  passingScore: number
  questionsDetail?: QuestionDetail[]
  onRetry?: () => void
  onExit?: () => void
}

export default function TestResults({
  testId,
  attemptId,
  score,
  passed,
  correctCount,
  totalQuestions,
  passingScore,
  questionsDetail,
  onRetry,
  onExit
}: TestResultsProps) {
  const [showDetails, setShowDetails] = useState(false)
  
  useEffect(() => {
    if (passed) {
      // Disparar confetti se passou
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#003366', '#FFA500']
      })
    }
  }, [passed])

  const incorrectCount = totalQuestions - correctCount
  const percentage = Math.round((correctCount / totalQuestions) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-navy-900 rounded-2xl shadow-xl overflow-hidden border border-gold-500/20">
        {/* Header com cor baseada no resultado */}
        <div className={`p-8 text-white text-center ${
          passed 
            ? 'bg-gradient-to-br from-green-500 to-green-600' 
            : 'bg-gradient-to-br from-red-500 to-red-600'
        }`}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-block mb-4"
          >
            {passed ? (
              <Trophy className="w-20 h-20 mx-auto" />
            ) : (
              <XCircle className="w-20 h-20 mx-auto" />
            )}
          </motion.div>
          
          <h1 className="text-3xl font-bold mb-2">
            {passed ? 'Parabéns! Você foi aprovado!' : 'Não foi desta vez'}
          </h1>
          <p className="text-xl opacity-90">
            {passed 
              ? 'Excelente trabalho! Continue assim!' 
              : 'Não desista! Você pode tentar novamente.'}
          </p>
        </div>

        {/* Pontuação principal */}
        <div className="p-8">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 150 }}
              className="inline-block"
            >
              <div className="relative">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    fill="none"
                  />
                  <motion.circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke={passed ? '#10b981' : '#ef4444'}
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - score / 100)}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 70 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 70 * (1 - score / 100) }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div>
                    <span className="text-5xl font-bold text-gold">{score.toFixed(0)}</span>
                    <span className="text-2xl text-gold-400">%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center p-4 bg-navy-800 rounded-lg border border-gold-500/20"
            >
              <div className="flex justify-center mb-2">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gold">{correctCount}</p>
              <p className="text-sm text-gold-300">Acertos</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center p-4 bg-navy-800 rounded-lg border border-gold-500/20"
            >
              <div className="flex justify-center mb-2">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-gold">{incorrectCount}</p>
              <p className="text-sm text-gold-300">Erros</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-center p-4 bg-navy-800 rounded-lg border border-gold-500/20"
            >
              <div className="flex justify-center mb-2">
                <TrendingUp className="w-8 h-8 text-gold-500" />
              </div>
              <p className="text-2xl font-bold text-gold">{percentage}%</p>
              <p className="text-sm text-gold-300">Aproveitamento</p>
            </motion.div>
          </div>

          {/* Barra de progresso para nota mínima */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gold-300 mb-2">
              <span>Nota mínima: {passingScore}%</span>
              <span>Sua nota: {score.toFixed(1)}%</span>
            </div>
            <div className="relative h-4 bg-navy-800 rounded-full overflow-hidden border border-gold-500/20">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, score)}%` }}
                transition={{ duration: 1, delay: 0.7 }}
                className={`h-full ${passed ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <div
                className="absolute top-0 h-full w-0.5 bg-gold-500"
                style={{ left: `${passingScore}%` }}
              />
            </div>
          </div>

          {/* Botão para ver detalhes das questões */}
          {questionsDetail && questionsDetail.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-navy-800 hover:bg-navy-700 text-gold-300 rounded-lg transition-colors border border-gold-500/20"
              >
                {showDetails ? (
                  <>
                    <EyeOff className="w-5 h-5" />
                    Ocultar Respostas
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5" />
                    Ver Suas Respostas
                  </>
                )}
              </button>
            </div>
          )}

          {/* Detalhes das questões (sem justificativas) */}
          {showDetails && questionsDetail && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 space-y-3"
            >
              <h3 className="text-lg font-semibold text-gold mb-3">Suas Respostas</h3>
              
              <div className="max-h-96 overflow-y-auto space-y-2">
                {questionsDetail.map((question) => (
                  <div
                    key={question.questionNumber}
                    className={`p-3 rounded-lg border ${
                      question.isCorrect 
                        ? 'bg-green-900/20 border-green-500/30' 
                        : 'bg-red-900/20 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-gold-400 font-semibold">
                        Questão {question.questionNumber}
                      </span>
                      {question.isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-gold-300/70">Sua resposta: </span>
                        <span className={`font-semibold ${
                          question.isCorrect ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {question.studentAnswer || '-'}
                        </span>
                      </div>
                      {!question.isCorrect && (
                        <div>
                          <span className="text-gold-300/70">Resposta correta: </span>
                          <span className="font-semibold text-green-400">
                            {question.correctAnswer}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-4">
            {onRetry && !passed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={onRetry}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-navy-900 rounded-lg hover:from-gold-600 hover:to-gold-700 transition-all font-semibold shadow-lg shadow-gold-500/20"
              >
                <RefreshCw className="w-5 h-5" />
                Tentar Novamente
              </motion.button>
            )}
            
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              onClick={onExit}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-navy-800 text-gold rounded-lg hover:bg-navy-700 transition-all font-medium border border-gold-500/30"
            >
              <Home className="w-5 h-5" />
              Voltar aos Testes
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mensagem motivacional */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-6 p-4 bg-navy-800 border border-gold-500/30 rounded-lg"
      >
        <p className="text-center text-gold-300">
          {passed 
            ? '🎉 Continue estudando e alcance resultados ainda melhores!'
            : '💪 A prática leva à perfeição. Revise o conteúdo e tente novamente!'}
        </p>
      </motion.div>
    </motion.div>
  )
}
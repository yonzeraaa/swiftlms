'use client'

import { motion } from 'framer-motion'
import { Trophy, XCircle, CheckCircle, RefreshCw, Home, TrendingUp } from 'lucide-react'
import confetti from 'canvas-confetti'
import { useEffect } from 'react'

interface TestResultsProps {
  testId: string
  attemptId: string
  score: number
  passed: boolean
  correctCount: number
  totalQuestions: number
  passingScore: number
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
  onRetry,
  onExit
}: TestResultsProps) {
  
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
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
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
                    <span className="text-5xl font-bold text-navy-900">{score.toFixed(0)}</span>
                    <span className="text-2xl text-gray-500">%</span>
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
              className="text-center p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex justify-center mb-2">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{correctCount}</p>
              <p className="text-sm text-gray-600">Acertos</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex justify-center mb-2">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{incorrectCount}</p>
              <p className="text-sm text-gray-600">Erros</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-center p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex justify-center mb-2">
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{percentage}%</p>
              <p className="text-sm text-gray-600">Aproveitamento</p>
            </motion.div>
          </div>

          {/* Barra de progresso para nota mínima */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Nota mínima: {passingScore}%</span>
              <span>Sua nota: {score.toFixed(1)}%</span>
            </div>
            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, score)}%` }}
                transition={{ duration: 1, delay: 0.7 }}
                className={`h-full ${passed ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <div
                className="absolute top-0 h-full w-0.5 bg-navy-900"
                style={{ left: `${passingScore}%` }}
              />
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-4">
            {onRetry && !passed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={onRetry}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors font-medium"
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
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors font-medium"
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
        className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"
      >
        <p className="text-center text-blue-800">
          {passed 
            ? '🎉 Continue estudando e alcance resultados ainda melhores!'
            : '💪 A prática leva à perfeição. Revise o conteúdo e tente novamente!'}
        </p>
      </motion.div>
    </motion.div>
  )
}
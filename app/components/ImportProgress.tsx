'use client'

import React from 'react'
import { Loader2, CheckCircle, XCircle, FileText, FolderOpen, BookOpen } from 'lucide-react'

interface ImportProgressProps {
  isImporting: boolean
  progress: {
    currentStep: string
    totalModules: number
    processedModules: number
    totalSubjects: number
    processedSubjects: number
    totalLessons: number
    processedLessons: number
    currentItem: string
    errors: string[]
  }
}

export default function ImportProgress({ isImporting, progress }: ImportProgressProps) {
  const calculatePercentage = () => {
    const total = progress.totalModules + progress.totalSubjects + progress.totalLessons
    const processed = progress.processedModules + progress.processedSubjects + progress.processedLessons
    
    if (total === 0) return 0
    
    // Calcular percentual com precisão decimal para animação mais suave
    const rawPercentage = (processed / total) * 100
    
    // Se estiver processando algo, adicionar um pequeno incremento para mostrar atividade
    if (isImporting && progress.currentItem && rawPercentage < 100) {
      // Adicionar 0.5% para indicar processamento em andamento
      return Math.min(99.5, rawPercentage + 0.5)
    }
    
    return Math.min(100, rawPercentage)
  }

  const percentage = calculatePercentage()

  if (!isImporting && progress.processedModules === 0) {
    return null
  }

  return (
    <div className="bg-navy-800/90 border border-gold-500/20 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gold flex items-center gap-2">
          {isImporting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Importando do Google Drive...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 text-green-400" />
              Importação Concluída
            </>
          )}
        </h3>
        <span className="text-gold-300 font-medium">{percentage.toFixed(1)}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-navy-900/50 rounded-full h-3 overflow-hidden relative">
        <div 
          className="h-full bg-gradient-to-r from-gold-500 to-gold-600 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
        {/* Animated stripe overlay for active processing */}
        {isImporting && (
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 215, 0, 0.5) 10px, rgba(255, 215, 0, 0.5) 20px)',
              animation: 'slide 1s linear infinite'
            }}
          />
        )}
      </div>

      {/* Status Details */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-gold-400" />
          <div>
            <span className="text-gold-200">Módulos: </span>
            <span className="text-gold font-medium">
              {progress.processedModules}/{progress.totalModules}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gold-400" />
          <div>
            <span className="text-gold-200">Disciplinas: </span>
            <span className="text-gold font-medium">
              {progress.processedSubjects}/{progress.totalSubjects}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gold-400" />
          <div>
            <span className="text-gold-200">Aulas: </span>
            <span className="text-gold font-medium">
              {progress.processedLessons}/{progress.totalLessons}
            </span>
          </div>
        </div>
      </div>

      {/* Current Action */}
      {isImporting && progress.currentItem && (
        <div className="text-sm text-gold-300 bg-navy-900/30 rounded p-2">
          <span className="text-gold-400">Processando:</span> {progress.currentItem}
        </div>
      )}

      {/* Current Step */}
      {isImporting && progress.currentStep && (
        <div className="text-sm text-gold-300">
          <span className="text-gold-400">Etapa:</span> {progress.currentStep}
        </div>
      )}

      {/* Errors */}
      {progress.errors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-red-400 font-medium">
            <XCircle className="w-4 h-4" />
            Erros encontrados ({progress.errors.length})
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {progress.errors.map((error, index) => (
              <div key={index} className="text-xs text-red-300">
                • {error}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
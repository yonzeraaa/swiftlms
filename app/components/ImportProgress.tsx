'use client'

import React, { useMemo } from 'react'
import { Loader2, CheckCircle, XCircle, FileText, FolderOpen, BookOpen, AlertTriangle } from 'lucide-react'
import type { ImportProgressData } from '../hooks/useImportProgress'

interface ImportProgressProps {
  progress: ImportProgressData
  isImporting: boolean
  onCancel?: () => void
}

export default function ImportProgress({ progress, isImporting, onCancel }: ImportProgressProps) {
  // Calcular porcentagem com fallback
  const percentage = useMemo(() => {
    // Se já temos porcentagem calculada do backend, usar ela
    if (progress.percentage !== undefined && progress.percentage !== null) {
      return progress.percentage
    }
    
    // Senão, calcular localmente
    const total = progress.totalModules + progress.totalSubjects + progress.totalLessons
    const processed = progress.processedModules + progress.processedSubjects + progress.processedLessons
    
    if (total === 0) return 0
    return Math.round((processed / total) * 100)
  }, [progress])

  // Determinar cor da barra baseado no estado
  const getProgressColor = () => {
    if (progress.errors.length > 0) return 'from-yellow-500 to-yellow-600'
    if (progress.completed) return 'from-green-500 to-green-600'
    return 'from-gold-500 to-gold-600'
  }

  // Determinar ícone e mensagem do header
  const getHeaderContent = () => {
    if (progress.completed && progress.errors.length === 0) {
      return {
        icon: <CheckCircle className="w-5 h-5 text-green-400" />,
        text: 'Importação Concluída com Sucesso'
      }
    }
    if (progress.completed && progress.errors.length > 0) {
      return {
        icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
        text: 'Importação Concluída com Avisos'
      }
    }
    if (isImporting) {
      return {
        icon: <Loader2 className="w-5 h-5 animate-spin" />,
        text: 'Importando do Google Drive...'
      }
    }
    return {
      icon: <FileText className="w-5 h-5" />,
      text: 'Pronto para Importar'
    }
  }

  const { icon: headerIcon, text: headerText } = getHeaderContent()

  // Se não está importando e não há dados, não renderizar
  if (!isImporting && percentage === 0 && !progress.completed) {
    return null
  }

  return (
    <div className="bg-navy-800/90 border border-gold-500/20 rounded-lg p-4 space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gold flex items-center gap-2">
          {headerIcon}
          {headerText}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-gold-300 font-bold text-lg">{percentage}%</span>
          {isImporting && onCancel && (
            <button
              onClick={onCancel}
              className="text-gold-400 hover:text-gold-200 transition-colors"
              title="Cancelar importação"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="relative">
        {/* Background */}
        <div className="w-full bg-navy-900/50 rounded-full h-4 overflow-hidden">
          {/* Progress Fill */}
          <div 
            className={`h-full bg-gradient-to-r ${getProgressColor()} transition-all duration-500 ease-out relative`}
            style={{ width: `${percentage}%` }}
          >
            {/* Shimmer effect when importing */}
            {isImporting && percentage < 100 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
          </div>
        </div>
        
        {/* Percentage label on the bar */}
        {percentage > 5 && (
          <div 
            className="absolute top-1/2 -translate-y-1/2 text-xs font-bold text-white drop-shadow-lg"
            style={{ left: `${Math.min(percentage - 5, 85)}%` }}
          >
            {percentage}%
          </div>
        )}
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Módulos */}
        <div className="bg-navy-900/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-gold-200">Módulos</span>
          </div>
          <div className="text-lg font-bold text-gold">
            {progress.processedModules}/{progress.totalModules}
          </div>
          {progress.totalModules > 0 && (
            <div className="w-full bg-navy-900/50 rounded-full h-1 mt-2">
              <div 
                className="h-full bg-blue-400 rounded-full transition-all duration-300"
                style={{ width: `${(progress.processedModules / progress.totalModules) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Disciplinas */}
        <div className="bg-navy-900/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-gold-200">Disciplinas</span>
          </div>
          <div className="text-lg font-bold text-gold">
            {progress.processedSubjects}/{progress.totalSubjects}
          </div>
          {progress.totalSubjects > 0 && (
            <div className="w-full bg-navy-900/50 rounded-full h-1 mt-2">
              <div 
                className="h-full bg-green-400 rounded-full transition-all duration-300"
                style={{ width: `${(progress.processedSubjects / progress.totalSubjects) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Aulas */}
        <div className="bg-navy-900/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-gold-200">Aulas</span>
          </div>
          <div className="text-lg font-bold text-gold">
            {progress.processedLessons}/{progress.totalLessons}
          </div>
          {progress.totalLessons > 0 && (
            <div className="w-full bg-navy-900/50 rounded-full h-1 mt-2">
              <div 
                className="h-full bg-purple-400 rounded-full transition-all duration-300"
                style={{ width: `${(progress.processedLessons / progress.totalLessons) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Current Action */}
      {isImporting && progress.currentItem && (
        <div className="bg-navy-900/30 rounded-lg p-3 border border-gold-500/10">
          <div className="flex items-start gap-2">
            <Loader2 className="w-4 h-4 text-gold-400 animate-spin mt-0.5" />
            <div className="flex-1">
              <div className="text-xs text-gold-400 font-medium mb-1">Processando:</div>
              <div className="text-sm text-gold-200 break-words">{progress.currentItem}</div>
            </div>
          </div>
        </div>
      )}

      {/* Current Step */}
      {progress.currentStep && (
        <div className="text-sm text-gold-300 flex items-center gap-2">
          <span className="text-gold-400 font-medium">Etapa:</span>
          <span>{progress.currentStep}</span>
        </div>
      )}

      {/* Errors Section */}
      {progress.errors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-red-400 font-medium">
            <XCircle className="w-4 h-4" />
            <span>Erros encontrados ({progress.errors.length})</span>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {progress.errors.map((error, index) => (
              <div key={index} className="text-xs text-red-300 pl-6">
                • {error}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Message */}
      {progress.completed && progress.errors.length === 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              Importação concluída com sucesso! Todos os itens foram processados.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
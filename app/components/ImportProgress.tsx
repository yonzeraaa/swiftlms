'use client'

import React, { useMemo } from 'react'
import { Loader2, CheckCircle, XCircle, FileText, FolderOpen, BookOpen, AlertTriangle, ClipboardCheck, Clock } from 'lucide-react'
import type { ImportProgressData } from '../hooks/useImportProgress'

interface ImportProgressProps {
  progress: ImportProgressData
  isImporting: boolean
  onCancel?: () => void
}

export default function ImportProgress({ progress, isImporting, onCancel }: ImportProgressProps) {
  // Calcular porcentagem com fallback
  const percentage = useMemo(() => {
    if (progress.percentage !== undefined && progress.percentage !== null) {
      return progress.percentage
    }

    const total = progress.totalModules + progress.totalSubjects + progress.totalLessons + progress.totalTests
    const processed = progress.processedModules + progress.processedSubjects + progress.processedLessons + progress.processedTests

    if (total === 0) return 0
    return Math.round((processed / total) * 100)
  }, [progress])

  // Calcular tempo decorrido e estimado
  const timeInfo = useMemo(() => {
    if (!progress.startedAt) return null

    const startTime = new Date(progress.startedAt).getTime()
    const currentTime = Date.now()
    const elapsedMs = currentTime - startTime
    const elapsedMinutes = Math.floor(elapsedMs / 60000)
    const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000)

    const totalItems = progress.totalModules + progress.totalSubjects + progress.totalLessons + progress.totalTests
    const processedItems = progress.processedModules + progress.processedSubjects + progress.processedLessons + progress.processedTests

    if (processedItems > 0 && totalItems > 0 && !progress.completed) {
      const itemsRemaining = totalItems - processedItems
      const avgTimePerItem = elapsedMs / processedItems
      const estimatedRemainingMs = avgTimePerItem * itemsRemaining
      const estimatedMinutes = Math.floor(estimatedRemainingMs / 60000)
      const estimatedSeconds = Math.floor((estimatedRemainingMs % 60000) / 1000)

      return {
        elapsed: `${elapsedMinutes}m ${elapsedSeconds}s`,
        estimated: `~${estimatedMinutes}m ${estimatedSeconds}s`
      }
    }

    return {
      elapsed: `${elapsedMinutes}m ${elapsedSeconds}s`,
      estimated: null
    }
  }, [progress])

  // Determinar cor da barra baseado no estado
  const getProgressColor = () => {
    if (progress.errors.length > 0) return 'from-yellow-500 to-yellow-600'
    if (progress.completed) return 'from-green-500 to-green-600'
    return 'from-gold-500 to-gold-600'
  }

  // Determinar ícone e mensagem do header baseado na fase
  const getHeaderContent = () => {
    if (progress.completed && progress.errors.length === 0) {
      return {
        icon: <CheckCircle className="w-5 h-5 text-green-400" />,
        text: 'Importação Concluída com Sucesso',
        badge: 'Concluído',
        badgeColor: 'bg-green-500/20 text-green-400 border-green-500/30'
      }
    }
    if (progress.completed && progress.errors.length > 0) {
      return {
        icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
        text: 'Importação Concluída com Avisos',
        badge: 'Concluído com avisos',
        badgeColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      }
    }
    if (progress.phase === 'scanning') {
      return {
        icon: <Loader2 className="w-5 h-5 animate-spin text-blue-400" />,
        text: 'Descobrindo estrutura...',
        badge: '🔍 Discovery',
        badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      }
    }
    if (isImporting || progress.phase === 'processing') {
      return {
        icon: <Loader2 className="w-5 h-5 animate-spin text-gold-400" />,
        text: 'Importando do Google Drive...',
        badge: '⚙️ Processing',
        badgeColor: 'bg-gold-500/20 text-gold-400 border-gold-500/30'
      }
    }
    return {
      icon: <FileText className="w-5 h-5" />,
      text: 'Pronto para Importar',
      badge: 'Aguardando',
      badgeColor: 'bg-navy-600/50 text-gray-400 border-gray-500/30'
    }
  }

  const { icon: headerIcon, text: headerText, badge, badgeColor } = getHeaderContent()

  // Se não está importando e não há dados, não renderizar
  if (!isImporting && percentage === 0 && !progress.completed) {
    return null
  }

  return (
    <div className="bg-navy-800/90 border border-gold-500/20 rounded-lg p-5 space-y-4 animate-fadeIn shadow-xl">
      {/* Header com Badge de Fase */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gold flex items-center gap-2">
            {headerIcon}
            {headerText}
          </h3>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badgeColor}`}>
            {badge}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {timeInfo && (
            <div className="flex items-center gap-2 text-xs text-gold-300">
              <Clock className="w-4 h-4" />
              <span>{timeInfo.elapsed}</span>
              {timeInfo.estimated && (
                <>
                  <span className="text-gray-500">•</span>
                  <span className="text-gold-400">{timeInfo.estimated} restantes</span>
                </>
              )}
            </div>
          )}
          <span className="text-gold-300 font-bold text-xl">{percentage}%</span>
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
        <div className="w-full bg-navy-900/50 rounded-full h-5 overflow-hidden border border-gold-500/10">
          <div
            className={`h-full bg-gradient-to-r ${getProgressColor()} transition-all duration-500 ease-out relative`}
            style={{ width: `${percentage}%` }}
          >
            {isImporting && percentage < 100 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
          </div>
        </div>

        {percentage > 5 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 text-xs font-bold text-white drop-shadow-lg"
            style={{ left: `${Math.min(percentage - 5, 85)}%` }}
          >
            {percentage}%
          </div>
        )}
      </div>

      {/* Status Grid - 2x2 Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Módulos */}
        <div className="bg-navy-900/40 rounded-lg p-4 border border-blue-500/20 hover:border-blue-500/40 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-gold-200">Módulos</span>
          </div>
          <div className="text-2xl font-bold text-gold mb-2">
            {progress.processedModules}/{progress.totalModules}
          </div>
          {progress.totalModules > 0 && (
            <div className="w-full bg-navy-900/50 rounded-full h-1.5">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-300"
                style={{ width: `${(progress.processedModules / progress.totalModules) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Disciplinas */}
        <div className="bg-navy-900/40 rounded-lg p-4 border border-green-500/20 hover:border-green-500/40 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-green-400" />
            <span className="text-sm font-medium text-gold-200">Disciplinas</span>
          </div>
          <div className="text-2xl font-bold text-gold mb-2">
            {progress.processedSubjects}/{progress.totalSubjects}
          </div>
          {progress.totalSubjects > 0 && (
            <div className="w-full bg-navy-900/50 rounded-full h-1.5">
              <div
                className="h-full bg-green-400 rounded-full transition-all duration-300"
                style={{ width: `${(progress.processedSubjects / progress.totalSubjects) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Aulas */}
        <div className="bg-navy-900/40 rounded-lg p-4 border border-purple-500/20 hover:border-purple-500/40 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium text-gold-200">Aulas</span>
          </div>
          <div className="text-2xl font-bold text-gold mb-2">
            {progress.processedLessons}/{progress.totalLessons}
          </div>
          {progress.totalLessons > 0 && (
            <div className="w-full bg-navy-900/50 rounded-full h-1.5">
              <div
                className="h-full bg-purple-400 rounded-full transition-all duration-300"
                style={{ width: `${(progress.processedLessons / progress.totalLessons) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Testes - NOVO */}
        <div className="bg-navy-900/40 rounded-lg p-4 border border-amber-500/20 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-medium text-gold-200">Testes</span>
          </div>
          <div className="text-2xl font-bold text-gold mb-2">
            {progress.processedTests}/{progress.totalTests}
          </div>
          {progress.totalTests > 0 && (
            <div className="w-full bg-navy-900/50 rounded-full h-1.5">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${(progress.processedTests / progress.totalTests) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Current Action */}
      {isImporting && progress.currentItem && (
        <div className="bg-navy-900/40 rounded-lg p-4 border border-gold-500/20">
          <div className="flex items-start gap-3">
            <Loader2 className="w-5 h-5 text-gold-400 animate-spin mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gold-400 font-medium mb-1">Item Atual:</div>
              <div className="text-sm text-gold-200 break-words">{progress.currentItem}</div>
            </div>
          </div>
        </div>
      )}

      {/* Current Step */}
      {progress.currentStep && (
        <div className="text-sm text-gold-300 flex items-center gap-2 px-2">
          <span className="text-gold-400 font-medium">Etapa:</span>
          <span className="flex-1">{progress.currentStep}</span>
        </div>
      )}

      {/* Warnings Section */}
      {progress.warnings && progress.warnings.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-yellow-400 font-medium">
            <AlertTriangle className="w-4 h-4" />
            <span>Avisos ({progress.warnings.length})</span>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {progress.warnings.map((warning, index) => (
              <div key={index} className="text-xs text-yellow-300 pl-6">
                • {warning}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Errors Section */}
      {progress.errors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-red-400 font-medium">
            <XCircle className="w-4 h-4" />
            <span>Erros ({progress.errors.length})</span>
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
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">
              Importação concluída com sucesso! {progress.totalModules + progress.totalSubjects + progress.totalLessons + progress.totalTests} itens processados.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

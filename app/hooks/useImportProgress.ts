'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface ImportProgressData {
  currentStep: string
  totalModules: number
  processedModules: number
  totalSubjects: number
  processedSubjects: number
  totalLessons: number
  processedLessons: number
  totalTests: number
  processedTests: number
  currentItem: string
  errors: string[]
  warnings: string[]
  percentage: number
  completed: boolean
  phase: string
  startedAt: string | null
}

interface UseImportProgressOptions {
  onComplete?: () => void
  onError?: (error: string) => void
  pollingInterval?: number
}

export function useImportProgress(options: UseImportProgressOptions = {}) {
  const { 
    onComplete, 
    onError, 
    pollingInterval = 500 
  } = options

  const [importId, setImportId] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState<ImportProgressData>({
    currentStep: '',
    totalModules: 0,
    processedModules: 0,
    totalSubjects: 0,
    processedSubjects: 0,
    totalLessons: 0,
    processedLessons: 0,
    totalTests: 0,
    processedTests: 0,
    currentItem: '',
    errors: [],
    warnings: [],
    percentage: 0,
    completed: false,
    phase: '',
    startedAt: null
  })
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)
  const jobIdRef = useRef<string | null>(null)
  const progressTokenRef = useRef<string | null>(null)

  // Função para buscar progresso
  const fetchProgress = useCallback(async (id: string) => {
    if (!mountedRef.current) return

    try {
      console.log(`[useImportProgress] Fetching progress for: ${id}`)
      
      const params = new URLSearchParams({ importId: id })
      if (jobIdRef.current) params.set('jobId', jobIdRef.current)
      if (progressTokenRef.current) params.set('token', progressTokenRef.current)

      const response = await fetch(`/api/import-from-drive-status?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      })
      
      if (!response.ok) {
        let errorMessage = 'Erro ao buscar progresso'
        try {
          // Tentar parsear o erro apenas se há conteúdo na resposta
          const responseText = await response.text()
          if (responseText.trim()) {
            const error = JSON.parse(responseText)
            errorMessage = error.error || errorMessage
          }
        } catch (parseError) {
          console.warn('[useImportProgress] Failed to parse error response:', parseError)
        }
        
        console.error('[useImportProgress] Error fetching progress:', errorMessage)
        if (onError) onError(errorMessage)
        return
      }

      // Verificar se a resposta tem conteúdo antes de tentar parsear
      const responseText = await response.text()
      if (!responseText.trim()) {
        console.warn('[useImportProgress] Empty response received')
        return
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('[useImportProgress] Failed to parse JSON response:', parseError)
        console.error('[useImportProgress] Response text:', responseText.substring(0, 200))
        if (onError) onError('Erro ao processar resposta do servidor')
        return
      }

      console.log('[useImportProgress] Progress data received:', {
        percentage: data.percentage,
        processedLessons: data.processedLessons,
        totalLessons: data.totalLessons,
        processedTests: data.processedTests,
        totalTests: data.totalTests,
        processedModules: data.processedModules,
        totalModules: data.totalModules,
        processedSubjects: data.processedSubjects,
        totalSubjects: data.totalSubjects,
        currentStep: data.currentStep,
        phase: data.phase
      })

      // Garantir que todos os campos existem
      const safeProgress: ImportProgressData = {
        currentStep: data.currentStep || '',
        totalModules: data.totalModules || 0,
        processedModules: data.processedModules || 0,
        totalSubjects: data.totalSubjects || 0,
        processedSubjects: data.processedSubjects || 0,
        totalLessons: data.totalLessons || 0,
        processedLessons: data.processedLessons || 0,
        totalTests: data.totalTests || 0,
        processedTests: data.processedTests || 0,
        currentItem: data.currentItem || '',
        errors: Array.isArray(data.errors) ? data.errors : [],
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
        percentage: data.percentage || calculatePercentage(data),
        completed: data.completed || false,
        phase: data.phase || '',
        startedAt: data.startedAt || null
      }

      if (mountedRef.current) {
        setProgress(safeProgress)

        // Logs coloridos no console do navegador
        logProgress(safeProgress, true)

        // Se completou, parar polling
        if (safeProgress.completed) {
          console.log('[useImportProgress] Import completed')
          stopPolling()
          setIsImporting(false)
          jobIdRef.current = null
          progressTokenRef.current = null
          if (onComplete) onComplete()
        }
      }
    } catch (error) {
      console.error('[useImportProgress] Network error:', error)
      if (onError && mountedRef.current) {
        onError('Erro de conexão ao verificar progresso')
      }
    }
  }, [onComplete, onError])

  // Calcular porcentagem se não vier do backend
  const calculatePercentage = (data: any): number => {
    const total = (data.totalModules || 0) + (data.totalSubjects || 0) + (data.totalLessons || 0) + (data.totalTests || 0)
    const processed = (data.processedModules || 0) + (data.processedSubjects || 0) + (data.processedLessons || 0) + (data.processedTests || 0)

    if (total === 0) return 0
    return Math.min(100, Math.round((processed / total) * 100))
  }

  // Função para logs coloridos no console do navegador
  const logProgress = (data: ImportProgressData, isUpdate: boolean = false) => {
    const phaseColors: Record<string, string> = {
      'scanning': '#3b82f6', // blue
      'processing': '#f59e0b', // amber
      'completed': '#10b981', // green
    }

    const phaseEmojis: Record<string, string> = {
      'scanning': '🔍',
      'processing': '⚙️',
      'completed': '✅',
    }

    const phaseColor = phaseColors[data.phase] || '#6b7280'
    const phaseEmoji = phaseEmojis[data.phase] || '📊'

    // Log de fase
    if (!isUpdate || data.phase) {
      console.log(
        `%c[${phaseEmoji} ${data.phase.toUpperCase() || 'IMPORT'}]%c ${data.currentStep}`,
        `color: ${phaseColor}; font-weight: bold`,
        'color: inherit'
      )
    }

    // Tabela de progresso
    console.table({
      'Módulos': `${data.processedModules}/${data.totalModules}`,
      'Disciplinas': `${data.processedSubjects}/${data.totalSubjects}`,
      'Aulas': `${data.processedLessons}/${data.totalLessons}`,
      'Testes': `${data.processedTests}/${data.totalTests}`,
      'Progresso': `${data.percentage}%`
    })

    // Item atual sendo processado
    if (data.currentItem) {
      console.log(
        '%c[ITEM ATUAL]%c ' + data.currentItem,
        'color: #8b5cf6; font-weight: bold',
        'color: inherit'
      )
    }

    // Warnings (items ignorados)
    if (data.warnings && data.warnings.length > 0) {
      data.warnings.forEach(warning => {
        console.warn(
          '%c[⚠️ IGNORADO]%c ' + warning,
          'color: #f59e0b; font-weight: bold',
          'color: inherit'
        )
      })
    }

    // Erros
    if (data.errors && data.errors.length > 0) {
      data.errors.forEach(error => {
        console.error(
          '%c[❌ ERRO]%c ' + error,
          'color: #ef4444; font-weight: bold',
          'color: inherit'
        )
      })
    }

    // Tempo decorrido e estimado (se disponível)
    if (data.startedAt) {
      const startTime = new Date(data.startedAt).getTime()
      const currentTime = Date.now()
      const elapsedMs = currentTime - startTime
      const elapsedMinutes = Math.floor(elapsedMs / 60000)
      const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000)

      const totalItems = data.totalModules + data.totalSubjects + data.totalLessons + data.totalTests
      const processedItems = data.processedModules + data.processedSubjects + data.processedLessons + data.processedTests

      if (processedItems > 0 && totalItems > 0 && !data.completed) {
        const itemsRemaining = totalItems - processedItems
        const avgTimePerItem = elapsedMs / processedItems
        const estimatedRemainingMs = avgTimePerItem * itemsRemaining
        const estimatedMinutes = Math.floor(estimatedRemainingMs / 60000)
        const estimatedSeconds = Math.floor((estimatedRemainingMs % 60000) / 1000)

        console.log(
          '%c[⏱️ TEMPO]%c Decorrido: %c%dm %ds%c • Estimado restante: %c~%dm %ds',
          'color: #06b6d4; font-weight: bold',
          'color: inherit',
          'color: #06b6d4; font-weight: bold',
          elapsedMinutes,
          elapsedSeconds,
          'color: inherit',
          'color: #06b6d4; font-weight: bold',
          estimatedMinutes,
          estimatedSeconds
        )
      } else {
        console.log(
          '%c[⏱️ TEMPO]%c Decorrido: %c%dm %ds',
          'color: #06b6d4; font-weight: bold',
          'color: inherit',
          'color: #06b6d4; font-weight: bold',
          elapsedMinutes,
          elapsedSeconds
        )
      }
    }

    // Linha separadora
    console.log('%c' + '─'.repeat(60), 'color: #9ca3af')
  }

  // Iniciar polling
  const startPolling = useCallback((id: string) => {
    console.log(`[useImportProgress] Starting polling for: ${id}`)
    
    // Limpar intervalo anterior se existir
    stopPolling()
    
    // Fazer primeira busca imediatamente
    fetchProgress(id)
    
    // Configurar polling
    intervalRef.current = setInterval(() => {
      fetchProgress(id)
    }, pollingInterval)
  }, [fetchProgress, pollingInterval])

  // Parar polling
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      console.log('[useImportProgress] Stopping polling')
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Iniciar importação
  const startImport = useCallback(async (
    driveUrl: string,
    courseId: string
  ) => {
    console.log('[useImportProgress] Starting import', { driveUrl, courseId })

    setIsImporting(true)
    setProgress({
      currentStep: 'Iniciando importação...',
      totalModules: 0,
      processedModules: 0,
      totalSubjects: 0,
      processedSubjects: 0,
      totalLessons: 0,
      processedLessons: 0,
      totalTests: 0,
      processedTests: 0,
      currentItem: '',
      errors: [],
      warnings: [],
      percentage: 0,
      completed: false,
      phase: 'starting',
      startedAt: null
    })

    try {
      const response = await fetch('/api/import-from-drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driveUrl,
          courseId
        })
      })

      if (!response.ok) {
        let errorMessage = 'Erro na importação'
        try {
          const responseText = await response.text()
          if (responseText.trim()) {
            const result = JSON.parse(responseText)
            errorMessage = result.error || errorMessage
          }
        } catch (parseError) {
          console.warn('[useImportProgress] Failed to parse error response:', parseError)
          errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      // Verificar se a resposta tem conteúdo antes de tentar parsear
      const responseText = await response.text()
      if (!responseText.trim()) {
        throw new Error('Resposta vazia do servidor')
      }

      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error('[useImportProgress] Failed to parse import response:', parseError)
        console.error('[useImportProgress] Response text:', responseText.substring(0, 200))
        throw new Error('Erro ao processar resposta do servidor')
      }

      if (result.importId) {
        console.log('[useImportProgress] Import started with ID:', result.importId)
        jobIdRef.current = result.jobId ?? null
        progressTokenRef.current = result.progressToken ?? null
        setImportId(result.importId)
        startPolling(result.importId)
        return result.importId
      } else {
        throw new Error('ID de importação não recebido')
      }
    } catch (error: any) {
      console.error('[useImportProgress] Import error:', error)
      setIsImporting(false)
      if (onError) onError(error.message)
      throw error
    }
  }, [startPolling, onError])

  // Cancelar importação
  const cancelImport = useCallback(() => {
    console.log('[useImportProgress] Cancelling import')
    stopPolling()
    setIsImporting(false)
    setImportId(null)
    jobIdRef.current = null
    progressTokenRef.current = null
    setProgress({
      currentStep: '',
      totalModules: 0,
      processedModules: 0,
      totalSubjects: 0,
      processedSubjects: 0,
      totalLessons: 0,
      processedLessons: 0,
      totalTests: 0,
      processedTests: 0,
      currentItem: '',
      errors: [],
      warnings: [],
      percentage: 0,
      completed: false,
      phase: '',
      startedAt: null
    })
  }, [stopPolling])

  // Cleanup ao desmontar
  useEffect(() => {
    mountedRef.current = true
    
    return () => {
      mountedRef.current = false
      stopPolling()
    }
  }, [stopPolling])

  return {
    progress,
    isImporting,
    importId,
    startImport,
    cancelImport,
    startPolling,
    stopPolling
  }
}

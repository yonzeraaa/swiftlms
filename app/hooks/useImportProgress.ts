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
  currentItem: string
  errors: string[]
  percentage: number
  completed: boolean
  phase: string
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
    currentItem: '',
    errors: [],
    percentage: 0,
    completed: false,
    phase: ''
  })
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  // Função para buscar progresso
  const fetchProgress = useCallback(async (id: string) => {
    if (!mountedRef.current) return

    try {
      console.log(`[useImportProgress] Fetching progress for: ${id}`)
      
      const response = await fetch(`/api/import-from-drive-status?importId=${id}`)
      
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
        processedModules: data.processedModules,
        totalModules: data.totalModules,
        processedSubjects: data.processedSubjects,
        totalSubjects: data.totalSubjects,
        currentStep: data.currentStep
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
        currentItem: data.currentItem || '',
        errors: Array.isArray(data.errors) ? data.errors : [],
        percentage: data.percentage || calculatePercentage(data),
        completed: data.completed || false,
        phase: data.phase || ''
      }

      if (mountedRef.current) {
        setProgress(safeProgress)

        // Se completou, parar polling
        if (safeProgress.completed) {
          console.log('[useImportProgress] Import completed')
          stopPolling()
          setIsImporting(false)
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
    const total = (data.totalModules || 0) + (data.totalSubjects || 0) + (data.totalLessons || 0)
    const processed = (data.processedModules || 0) + (data.processedSubjects || 0) + (data.processedLessons || 0)
    
    if (total === 0) return 0
    return Math.min(100, Math.round((processed / total) * 100))
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
    courseId: string,
    options: { includeMedia?: boolean } = {}
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
      currentItem: '',
      errors: [],
      percentage: 0,
      completed: false,
      phase: 'starting'
    })

    try {
      const response = await fetch('/api/import-from-drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driveUrl,
          courseId,
          includeMedia: options.includeMedia !== false
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
    setProgress({
      currentStep: '',
      totalModules: 0,
      processedModules: 0,
      totalSubjects: 0,
      processedSubjects: 0,
      totalLessons: 0,
      processedLessons: 0,
      currentItem: '',
      errors: [],
      percentage: 0,
      completed: false,
      phase: ''
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

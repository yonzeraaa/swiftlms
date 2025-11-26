'use client'

import { ReactNode } from 'react'
import PremiumLoader from './ui/PremiumLoader'
import Skeleton, { SkeletonCard, SkeletonTable, SkeletonDashboard, SkeletonGroup } from './ui/Skeleton'

interface LoadingStateProps {
  isLoading: boolean
  children: ReactNode
  type?: 'spinner' | 'skeleton' | 'card' | 'table' | 'dashboard' | 'custom'
  customLoader?: ReactNode
  rows?: number
  className?: string
  showText?: boolean
  text?: string
}

export default function LoadingState({
  isLoading,
  children,
  type = 'spinner',
  customLoader,
  rows = 5,
  className = '',
  showText = true,
  text = 'Carregando...'
}: LoadingStateProps) {
  if (!isLoading) {
    return <>{children}</>
  }

  if (customLoader) {
    return <>{customLoader}</>
  }

  const renderLoader = () => {
    switch (type) {
      case 'skeleton':
        return (
          <SkeletonGroup className={className}>
            <Skeleton count={3} />
          </SkeletonGroup>
        )
      case 'card':
        return <SkeletonCard />
      case 'table':
        return <SkeletonTable rows={rows} />
      case 'dashboard':
        return <SkeletonDashboard />
      case 'spinner':
      default:
        return <PremiumLoader />
    }
  }

  return (
    <div className={`loading-state-wrapper ${className}`}>
      {renderLoader()}
    </div>
  )
}

// Hook para gerenciar loading states
import { useState, useCallback, useEffect } from 'react'

export function useLoadingState(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState)
  const [error, setError] = useState<Error | null>(null)

  const startLoading = useCallback(() => {
    setIsLoading(true)
    setError(null)
  }, [])

  const stopLoading = useCallback(() => {
    setIsLoading(false)
  }, [])

  const setLoadingError = useCallback((error: Error) => {
    setError(error)
    setIsLoading(false)
  }, [])

  const withLoading = useCallback(async <T,>(
    asyncFn: () => Promise<T>
  ): Promise<T | undefined> => {
    try {
      startLoading()
      const result = await asyncFn()
      stopLoading()
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setLoadingError(error)
      throw error
    }
  }, [startLoading, stopLoading, setLoadingError])

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setLoadingError,
    withLoading
  }
}

// Componente para gerenciar múltiplos loading states
interface MultiLoadingStateProps {
  states: Record<string, boolean>
  children: ReactNode
  fallback?: ReactNode
  showAny?: boolean // Mostra loading se qualquer estado estiver true
}

export function MultiLoadingState({
  states,
  children,
  fallback,
  showAny = true
}: MultiLoadingStateProps) {
  const isLoading = showAny 
    ? Object.values(states).some(state => state)
    : Object.values(states).every(state => state)

  if (isLoading) {
    return <>{fallback || <PremiumLoader />}</>
  }

  return <>{children}</>
}

// Componente para transições suaves entre loading states
interface TransitionLoadingProps {
  isLoading: boolean
  children: ReactNode
  loader?: ReactNode
  duration?: number
}

export function TransitionLoading({
  isLoading,
  children,
  loader,
  duration = 300
}: TransitionLoadingProps) {
  const [showLoader, setShowLoader] = useState(isLoading)
  const [showContent, setShowContent] = useState(!isLoading)

  useEffect(() => {
    if (isLoading) {
      setShowLoader(true)
      setShowContent(false)
    } else {
      setTimeout(() => {
        setShowLoader(false)
        setShowContent(true)
      }, duration)
    }
  }, [isLoading, duration])

  return (
    <div className="relative">
      {showLoader && (
        <div
          className={`transition-opacity duration-${duration} ${
            isLoading ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {loader || <PremiumLoader />}
        </div>
      )}
      {showContent && (
        <div
          className={`transition-opacity duration-${duration} ${
            !isLoading ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  )
}
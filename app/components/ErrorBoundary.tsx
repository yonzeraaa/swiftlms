'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Button from './Button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log to error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      // Here you could send to Sentry, LogRocket, etc.
      this.logErrorToService(error, errorInfo)
    }
  }

  logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Implement error logging to external service
    // Example: Sentry.captureException(error, { extra: errorInfo })
    console.error('Production error:', { error, errorInfo })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-navy-800/50 backdrop-blur-md border border-red-500/20 rounded-lg p-8 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-gold mb-2">
                  Ops! Algo deu errado
                </h1>
                <p className="text-gold-300">
                  Encontramos um erro inesperado. Por favor, tente novamente.
                </p>
              </div>

              {/* Error details in development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-navy-900/50 rounded-lg text-left">
                  <p className="text-red-400 font-mono text-sm mb-2">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className="text-gold-300 text-xs">
                      <summary className="cursor-pointer hover:text-gold-200">
                        Ver detalhes do erro
                      </summary>
                      <pre className="mt-2 overflow-auto max-h-40 text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Home className="w-4 h-4" />}
                  onClick={this.handleGoHome}
                >
                  Ir para Início
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<RefreshCw className="w-4 h-4" />}
                  onClick={this.handleReset}
                >
                  Tentar Novamente
                </Button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook para usar ErrorBoundary com componentes funcionais
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
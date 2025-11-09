'use client'

import { useEffect } from 'react'
import { SessionManager } from '@/lib/auth/session-manager'

/**
 * Componente que inicializa gestão de sessão
 * Deve ser usado em layouts autenticados
 */
export default function SessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Inicializar gestão de sessão (renovação automática e detecção de inatividade)
    const sessionManager = SessionManager.getInstance()
    sessionManager.startSession()

    // Cleanup ao desmontar
    return () => {
      sessionManager.endSession()
    }
  }, [])

  return <>{children}</>
}

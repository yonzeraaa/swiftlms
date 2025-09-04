'use client'

import { useAuth } from '@/app/providers/AuthProvider'

/**
 * Hook simplificado que usa o AuthProvider global
 * Mantido para compatibilidade com código existente
 */
export function useAuthSession() {
  const auth = useAuth()
  
  return {
    user: auth.user,
    session: auth.session,
    isLoading: auth.isLoading,
    error: auth.error,
    isAuthenticated: !!auth.session,
    refreshSession: auth.refreshSession,
    checkSession: async () => {
      // Compatibilidade - AuthProvider já faz isso automaticamente
      await auth.refreshSession()
    }
  }
}
'use client'

import { useEffect, useCallback } from 'react'
import { useAuth } from '../providers/AuthProvider'
import { sessionManager } from '@/lib/supabase/with-session'

export function useAuthSession() {
  const { session, refreshSession, ensureSession, isInitialized } = useAuth()

  // Automatic session validation on mount
  useEffect(() => {
    if (!isInitialized) return

    const validateSession = async () => {
      try {
        await sessionManager.ensureValidSession()
      } catch (error) {
        console.error('Session validation failed:', error)
        // AuthProvider will handle the redirect
      }
    }

    validateSession()
  }, [isInitialized])

  // Public methods
  const manualRefresh = useCallback(async () => {
    return await refreshSession()
  }, [refreshSession])

  const validateAndExecute = useCallback(async (operation: () => Promise<any>) => {
    try {
      await ensureSession()
      return await operation()
    } catch (error) {
      console.error('Operation failed, attempting session recovery:', error)
      
      const refreshedSession = await refreshSession()
      if (refreshedSession) {
        return await operation()
      }
      
      throw error
    }
  }, [ensureSession, refreshSession])

  return {
    session,
    isInitialized,
    refreshSession: manualRefresh,
    validateAndExecute
  }
}
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

  const validateAndExecute = useCallback(async function<T>(
    operation: () => Promise<T>
  ) {
    try {
      // Ensure session is valid before operation
      await ensureSession()
      return await operation()
    } catch (error) {
      console.error('Operation failed, attempting session recovery:', error)
      
      // Try to refresh session and retry once
      const refreshedSession = await refreshSession()
      if (refreshedSession) {
        return await operation()
      }
      
      throw error
    }
  }, [ensureSession, refreshSession]) as <T>(operation: () => Promise<T>) => Promise<T>

  return {
    session,
    isInitialized,
    refreshSession: manualRefresh,
    validateAndExecute
  }
}
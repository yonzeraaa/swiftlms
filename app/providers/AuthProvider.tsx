'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/utils/logger'
import { getSessionStatus, refreshSessionAction, signOutAction } from '@/lib/actions/auth'

interface AuthState {
  session: Session | null
  user: User | null
  isLoading: boolean
  error: string | null
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  getSession: () => Promise<Session | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

const SESSION_REFRESH_INTERVAL_MINUTES = 240
const SESSION_REFRESH_INTERVAL_MS = SESSION_REFRESH_INTERVAL_MINUTES * 60 * 1000
const SESSION_REFRESH_MARGIN_MS = 5 * 60 * 1000

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    isLoading: true,
    error: null
  })

  const router = useRouter()
  const refreshTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const isMountedRef = useRef(true)
  const authStateRef = useRef(authState)
  const refreshSessionRef = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    authStateRef.current = authState
  }, [authState])

  const updateAuthState = useCallback((nextState: AuthState) => {
    if (!isMountedRef.current) return

    authStateRef.current = nextState
    setAuthState(nextState)
  }, [])

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = undefined
    }
  }, [])

  const handleSessionExpired = useCallback((message?: string) => {
    if (!isMountedRef.current) return

    clearRefreshTimer()

    updateAuthState({
      session: null,
      user: null,
      isLoading: false,
      error: message ?? null
    })

    router.replace('/')
  }, [clearRefreshTimer, router, updateAuthState])

  const scheduleRefresh = useCallback((session: Session) => {
    clearRefreshTimer()

    if (!session.expires_at) return

    const expiresAt = session.expires_at * 1000
    const timeUntilExpiry = expiresAt - Date.now()

    if (timeUntilExpiry <= SESSION_REFRESH_MARGIN_MS) {
      logger.info('Session close to expiry, refreshing immediately', undefined, { context: 'AUTH_PROVIDER' })
      void refreshSessionRef.current()
      return
    }

    const refreshDelay = Math.min(
      timeUntilExpiry - SESSION_REFRESH_MARGIN_MS,
      SESSION_REFRESH_INTERVAL_MS
    )

    logger.info(
      'Session refresh scheduled',
      { minutesUntilRefresh: Math.round(refreshDelay / 1000 / 60) },
      { context: 'AUTH_PROVIDER' }
    )

    refreshTimerRef.current = setTimeout(() => {
      void refreshSessionRef.current()
    }, refreshDelay)
  }, [clearRefreshTimer])

  const applyAuthenticatedState = useCallback((status: Awaited<ReturnType<typeof getSessionStatus>>) => {
    if (!status.isAuthenticated || !status.user || !status.session) {
      return false
    }

    const session = { expires_at: status.session.expires_at } as Session

    updateAuthState({
      session,
      user: status.user as User,
      isLoading: false,
      error: null
    })

    scheduleRefresh(session)
    return true
  }, [scheduleRefresh, updateAuthState])

  const signOut = useCallback(async () => {
    try {
      await signOutAction()

      clearRefreshTimer()
      updateAuthState({
        session: null,
        user: null,
        isLoading: false,
        error: null
      })

      router.push('/')
    } catch (error) {
      logger.error('Error signing out', error, { context: 'AUTH_PROVIDER' })
    }
  }, [clearRefreshTimer, router, updateAuthState])

  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      logger.info('Refreshing session via server action', undefined, { context: 'AUTH_PROVIDER' })

      const result = await refreshSessionAction()

      if (!result.success) {
        logger.warn('Session refresh failed', { error: result.error }, { context: 'AUTH_PROVIDER' })
        handleSessionExpired('Sessão expirada. Faça login novamente.')
        return
      }

      const status = await getSessionStatus()

      if (applyAuthenticatedState(status)) {
        return
      }

      handleSessionExpired('Sessão expirada. Faça login novamente.')
    } catch (error) {
      logger.error('Session refresh error', error, { context: 'AUTH_PROVIDER' })
      handleSessionExpired('Sessão expirada. Faça login novamente.')
    }
  }, [applyAuthenticatedState, handleSessionExpired])

  useEffect(() => {
    refreshSessionRef.current = refreshSession
  }, [refreshSession])

  const revalidateSession = useCallback(async () => {
    try {
      const status = await getSessionStatus()

      if (applyAuthenticatedState(status)) {
        return
      }

      if (authStateRef.current.session) {
        handleSessionExpired('Sessão expirada. Faça login novamente.')
      } else if (authStateRef.current.isLoading) {
        updateAuthState({
          session: null,
          user: null,
          isLoading: false,
          error: null
        })
      }
    } catch (error) {
      logger.error('Error revalidating session', error, { context: 'AUTH_PROVIDER' })
    }
  }, [applyAuthenticatedState, handleSessionExpired, updateAuthState])

  useEffect(() => {
    isMountedRef.current = true
    let mounted = true

    const getInitialSession = async () => {
      try {
        logger.info('Getting initial session from server', undefined, { context: 'AUTH_PROVIDER' })

        const status = await getSessionStatus()

        if (!mounted) {
          return
        }

        if (applyAuthenticatedState(status)) {
          return
        }

        updateAuthState({
          session: null,
          user: null,
          isLoading: false,
          error: null
        })
      } catch (error) {
        logger.error('Error initializing auth', error, { context: 'AUTH_PROVIDER' })
        if (mounted) {
          updateAuthState({
            session: null,
            user: null,
            isLoading: false,
            error: 'Erro ao inicializar autenticação'
          })
        }
      }
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void revalidateSession()
      }
    }

    const handleFocus = () => {
      void revalidateSession()
    }

    const handleOnline = () => {
      void revalidateSession()
    }

    getInitialSession()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('online', handleOnline)

    return () => {
      mounted = false
      isMountedRef.current = false

      clearRefreshTimer()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('online', handleOnline)
    }
  }, [applyAuthenticatedState, clearRefreshTimer, revalidateSession, updateAuthState])

  const getSession = useCallback(async (): Promise<Session | null> => {
    try {
      const currentSession = authStateRef.current.session

      if (currentSession?.expires_at) {
        const expiresAt = currentSession.expires_at * 1000

        if (expiresAt > Date.now() + 60000) {
          return currentSession
        }
      }

      logger.info('Getting updated session from server', undefined, { context: 'AUTH_PROVIDER' })
      const status = await getSessionStatus()

      if (applyAuthenticatedState(status)) {
        return { expires_at: status.session!.expires_at } as Session
      }

      if (currentSession) {
        await refreshSession()

        const newStatus = await getSessionStatus()

        if (applyAuthenticatedState(newStatus)) {
          return { expires_at: newStatus.session!.expires_at } as Session
        }
      }

      return null
    } catch (error) {
      logger.error('Error getting session', error, { context: 'AUTH_PROVIDER' })
      return null
    }
  }, [applyAuthenticatedState, refreshSession])

  const contextValue: AuthContextType = {
    ...authState,
    signOut,
    refreshSession,
    getSession
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

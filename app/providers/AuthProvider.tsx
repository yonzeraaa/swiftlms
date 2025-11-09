'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
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

const REFRESH_INTERVAL = 30000 // 30 seconds - check session status
const SESSION_REFRESH_INTERVAL_MINUTES = 240
const SESSION_REFRESH_INTERVAL_MS = SESSION_REFRESH_INTERVAL_MINUTES * 60 * 1000

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    isLoading: true,
    error: null
  })

  const router = useRouter()
  const refreshTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const checkIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const isMountedRef = useRef(true)

  const handleSessionExpired = (message?: string) => {
    if (!isMountedRef.current) return

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = undefined
    }

    setAuthState({
      session: null,
      user: null,
      isLoading: false,
      error: message ?? null
    })

    router.replace('/')
  }

  const signOut = async () => {
    try {
      // Call server action to sign out (clears httpOnly cookies)
      await signOutAction()

      setAuthState({
        session: null,
        user: null,
        isLoading: false,
        error: null
      })
      router.push('/')
    } catch (error) {
      logger.error('Error signing out', error, { context: 'AUTH_PROVIDER' })
    }
  }

  const refreshSession = async (): Promise<void> => {
    try {
      logger.info('Refreshing session via server action', undefined, { context: 'AUTH_PROVIDER' })

      // Call server action to refresh session (updates httpOnly cookies)
      const result = await refreshSessionAction()

      if (!result.success) {
        logger.warn('Session refresh failed', { error: result.error }, { context: 'AUTH_PROVIDER' })
        handleSessionExpired('Sessão expirada. Faça login novamente.')
        return
      }

      // Get updated session status from server
      const status = await getSessionStatus()

      if (status.isAuthenticated && status.user && status.session) {
        setAuthState({
          session: { expires_at: status.session.expires_at } as Session,
          user: status.user as User,
          isLoading: false,
          error: null
        })

        scheduleRefresh({ expires_at: status.session.expires_at } as Session)
        return
      }

      handleSessionExpired('Sessão expirada. Faça login novamente.')
    } catch (error) {
      logger.error('Session refresh error', error, { context: 'AUTH_PROVIDER' })
      handleSessionExpired('Sessão expirada. Faça login novamente.')
    }
  }

  // Schedule automatic refresh
  const scheduleRefresh = (session: Session) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }

    if (!session.expires_at) return

    const expiresAt = new Date(session.expires_at * 1000).getTime()
    const now = Date.now()
    const timeUntilExpiry = expiresAt - now
    const refreshDelay = Math.max(
      Math.min(timeUntilExpiry, SESSION_REFRESH_INTERVAL_MS),
      0
    )

    if (refreshDelay > 0) {
      logger.info(`Session refresh scheduled`, { minutesUntilRefresh: Math.round(refreshDelay / 1000 / 60) }, { context: 'AUTH_PROVIDER' })
      refreshTimerRef.current = setTimeout(() => {
        refreshSession()
      }, refreshDelay)
    } else {
      logger.info('Immediate session refresh required', undefined, { context: 'AUTH_PROVIDER' })
      refreshSession()
    }
  }

  // Initialize auth state using server action
  useEffect(() => {
    isMountedRef.current = true
    let mounted = true

    // Get initial session from server
    const getInitialSession = async () => {
      try {
        logger.info('Getting initial session from server', undefined, { context: 'AUTH_PROVIDER' })

        // Call server action to get session status (reads httpOnly cookies)
        const status = await getSessionStatus()

        if (mounted) {
          if (status.isAuthenticated && status.user && status.session) {
            const session = { expires_at: status.session.expires_at } as Session

            setAuthState({
              session,
              user: status.user as User,
              isLoading: false,
              error: null
            })

            scheduleRefresh(session)
          } else {
            setAuthState({
              session: null,
              user: null,
              isLoading: false,
              error: null
            })
          }
        }
      } catch (error) {
        logger.error('Error initializing auth', error, { context: 'AUTH_PROVIDER' })
        if (mounted) {
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Erro ao inicializar autenticação'
          }))
        }
      }
    }

    // Periodically check session via server action
    checkIntervalRef.current = setInterval(() => {
      if (mounted) {
        getSessionStatus().then((status) => {
          if (status.isAuthenticated && status.session && status.session.expires_at) {
            const expiresAt = new Date((status.session.expires_at as number) * 1000).getTime()
            const now = Date.now()
            const timeUntilExpiry = expiresAt - now

            // If session is about to expire, refresh it
            if (timeUntilExpiry < 60000) { // Less than 1 minute
              logger.info('Session about to expire, refreshing', undefined, { context: 'AUTH_PROVIDER' })
              refreshSession()
            }
          } else if (!status.isAuthenticated && authState.session) {
            // Session disappeared, user may have logged out elsewhere
            logger.info('Session lost', undefined, { context: 'AUTH_PROVIDER' })
            refreshSession()
          }
        })
      }
    }, REFRESH_INTERVAL)

    // Note: No onAuthStateChange listener needed since we poll server-side session status
    // and don't have client-side session persistence

    getInitialSession()

    return () => {
      mounted = false
      isMountedRef.current = false

      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [router])

  // Function to get current session with robust checking
  const getSession = async (): Promise<Session | null> => {
    try {
      // First check current state
      if (authState.session && authState.session.expires_at) {
        const expiresAt = new Date(authState.session.expires_at * 1000).getTime()
        const now = Date.now()

        // If session is still valid, return it
        if (expiresAt > now + 60000) { // 1 minute margin
          return authState.session
        }
      }

      // Otherwise, get updated session from server
      logger.info('Getting updated session from server', undefined, { context: 'AUTH_PROVIDER' })
      const status = await getSessionStatus()

      if (!status.isAuthenticated || !status.session) {
        // Try refresh
        await refreshSession()

        // Check again
        const newStatus = await getSessionStatus()
        return newStatus.session ? ({ expires_at: newStatus.session.expires_at } as Session) : null
      }

      return { expires_at: status.session.expires_at } as Session
    } catch (error) {
      logger.error('Error getting session', error, { context: 'AUTH_PROVIDER' })
      return null
    }
  }

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

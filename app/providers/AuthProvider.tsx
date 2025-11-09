'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Session, User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/utils/logger'

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

  const supabase = createClient()
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
      await supabase.auth.signOut()
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
      logger.info('Refreshing session', undefined, { context: 'AUTH_PROVIDER' })

      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        logger.warn('Session refresh failed', { error: error.message }, { context: 'AUTH_PROVIDER' })
        throw error
      }

      if (data.session) {
        setAuthState({
          session: data.session,
          user: data.user,
          isLoading: false,
          error: null
        })

        scheduleRefresh(data.session)
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

  // Initialize auth state and listen for changes
  useEffect(() => {
    isMountedRef.current = true
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          logger.error('Error getting initial session', error, { context: 'AUTH_PROVIDER' })
        }

        if (mounted) {
          setAuthState({
            session,
            user: session?.user ?? null,
            isLoading: false,
            error: null
          })

          if (session) {
            scheduleRefresh(session)
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

    // Periodically check session
    checkIntervalRef.current = setInterval(() => {
      if (mounted) {
        supabase.auth.getSession().then(({ data }: any) => {
          const { session } = data
          if (session && session.expires_at) {
            const expiresAt = new Date(session.expires_at * 1000).getTime()
            const now = Date.now()
            const timeUntilExpiry = expiresAt - now

            // If session is about to expire, refresh it
            if (timeUntilExpiry < 60000) { // Less than 1 minute
              logger.info('Session about to expire, refreshing', undefined, { context: 'AUTH_PROVIDER' })
              refreshSession()
            }
          } else if (!session && authState.session) {
            // Session disappeared, user may have logged out elsewhere
            logger.info('Session lost, attempting recovery', undefined, { context: 'AUTH_PROVIDER' })
            refreshSession()
          }
        })
      }
    }, REFRESH_INTERVAL)

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        logger.info('Auth state changed', { event }, { context: 'AUTH_PROVIDER' })

        if (mounted) {
          if (session) {
            setAuthState({
              session,
              user: session?.user ?? null,
              isLoading: false,
              error: null
            })

            scheduleRefresh(session)
          } else if (event === 'INITIAL_SESSION') {
            setAuthState(prev => ({
              ...prev,
              session: null,
              user: null,
              isLoading: false,
              error: null
            }))
          } else {
            handleSessionExpired('Sessão expirada. Faça login novamente.')
          }
        }
      }
    )

    getInitialSession()

    return () => {
      mounted = false
      isMountedRef.current = false
      subscription.unsubscribe()

      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [supabase, router])

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

      // Otherwise, try to get updated session
      logger.info('Getting updated session', undefined, { context: 'AUTH_PROVIDER' })
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        // Try refresh
        await refreshSession()

        // Check again
        const { data: { session: newSession } } = await supabase.auth.getSession()
        return newSession
      }

      return session
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

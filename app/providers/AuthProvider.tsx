'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Session, User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface AuthState {
  session: Session | null
  user: User | null
  isLoading: boolean
  isInitialized: boolean
}

interface AuthContextType extends AuthState {
  refreshSession: () => Promise<Session | null>
  signOut: () => Promise<void>
  ensureSession: () => Promise<Session | null>
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    isLoading: true,
    isInitialized: false
  })
  
  const supabase = createClient()
  const router = useRouter()
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isRefreshingRef = useRef(false)
  const initializationRef = useRef(false)

  const scheduleRefresh = (session: Session | null) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    if (!session?.expires_at) return

    const expiresAt = session.expires_at * 1000
    const now = Date.now()
    const timeUntilExpiry = expiresAt - now
    const refreshIn = Math.max(0, timeUntilExpiry - 5 * 60 * 1000) // 5 min before expiry

    if (refreshIn > 0) {
      refreshTimeoutRef.current = setTimeout(() => {
        refreshSession()
      }, refreshIn)
    }
  }

  const ensureSession = async (): Promise<Session | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        return null
      }
      
      if (!session) {
        // Try to refresh if no session
        return await refreshSession()
      }
      
      return session
    } catch (error) {
      console.error('Error in ensureSession:', error)
      return null
    }
  }

  const refreshSession = async (): Promise<Session | null> => {
    if (isRefreshingRef.current) {
      return authState.session
    }

    isRefreshingRef.current = true

    try {
      console.log('Refreshing auth session...')
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        console.error('Session refresh failed:', error)
        
        // Clear auth state on refresh failure
        setAuthState(prev => ({
          ...prev,
          session: null,
          user: null,
          isLoading: false
        }))
        
        return null
      }

      if (data.session) {
        console.log('Session refreshed successfully')
        
        setAuthState(prev => ({
          ...prev,
          session: data.session,
          user: data.session?.user ?? null,
          isLoading: false
        }))
        
        scheduleRefresh(data.session)
        return data.session
      }

      return null
    } catch (error) {
      console.error('Unexpected error during refresh:', error)
      return null
    } finally {
      isRefreshingRef.current = false
    }
  }

  const signOut = async () => {
    try {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      await supabase.auth.signOut()
      
      setAuthState({
        session: null,
        user: null,
        isLoading: false,
        isInitialized: true
      })

      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Initialize auth state
  useEffect(() => {
    if (initializationRef.current) return
    initializationRef.current = true

    let mounted = true

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Initial session error:', error)
        }

        if (mounted) {
          setAuthState({
            session,
            user: session?.user ?? null,
            isLoading: false,
            isInitialized: true
          })

          if (session) {
            scheduleRefresh(session)
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            isInitialized: true
          }))
        }
      }
    }

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event)

        if (mounted) {
          setAuthState(prev => ({
            ...prev,
            session,
            user: session?.user ?? null,
            isLoading: false,
            isInitialized: true
          }))

          switch (event) {
            case 'SIGNED_IN':
            case 'TOKEN_REFRESHED':
              scheduleRefresh(session)
              break
            case 'SIGNED_OUT':
              if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current)
              }
              break
          }
        }
      }
    )

    // Listen for cross-tab storage changes
    const handleStorageChange = (event: Event) => {
      const customEvent = event as CustomEvent
      if (customEvent.detail?.key?.includes('sb-')) {
        console.log('Cross-tab auth change detected')
        // Re-initialize session
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (mounted) {
            setAuthState(prev => ({
              ...prev,
              session,
              user: session?.user ?? null
            }))
          }
        })
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('supabase-storage-change', handleStorageChange)
    }

    initializeAuth()

    return () => {
      mounted = false
      subscription.unsubscribe()
      
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
      
      if (typeof window !== 'undefined') {
        window.removeEventListener('supabase-storage-change', handleStorageChange)
      }
    }
  }, [supabase])

  const contextValue: AuthContextType = {
    ...authState,
    refreshSession,
    signOut,
    ensureSession
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}
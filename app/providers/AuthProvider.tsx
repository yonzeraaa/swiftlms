'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Session, User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface AuthState {
  session: Session | null
  user: User | null
  isLoading: boolean
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>
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
    isLoading: true
  })
  
  const supabase = createClient()
  const router = useRouter()

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setAuthState({
        session: null,
        user: null,
        isLoading: false
      })
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Initialize auth state and listen for changes
  useEffect(() => {
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting initial session:', error)
        }

        if (mounted) {
          setAuthState({
            session,
            user: session?.user ?? null,
            isLoading: false
          })
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          setAuthState(prev => ({
            ...prev,
            isLoading: false
          }))
        }
      }
    }

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event)

        if (mounted) {
          setAuthState({
            session,
            user: session?.user ?? null,
            isLoading: false
          })
        }
      }
    )

    getInitialSession()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, router])

  const contextValue: AuthContextType = {
    ...authState,
    signOut
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}
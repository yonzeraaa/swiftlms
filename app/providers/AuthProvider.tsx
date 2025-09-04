'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Session, User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { setupStorageSync } from '@/lib/supabase/cookie-storage'

interface AuthState {
  session: Session | null
  user: User | null
  isLoading: boolean
  error: string | null
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
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

const REFRESH_INTERVAL = 30000 // 30 segundos
const REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000 // 5 minutos

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
  const broadcastChannelRef = useRef<BroadcastChannel | undefined>(undefined)

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
      console.error('Error signing out:', error)
    }
  }

  const refreshSession = async (): Promise<void> => {
    try {
      console.log('[AuthProvider] Fazendo refresh da sess\u00e3o...')
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) throw error
      
      if (data.session) {
        setAuthState({
          session: data.session,
          user: data.user,
          isLoading: false,
          error: null
        })
        
        // Notificar outras abas
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({ type: 'SESSION_REFRESHED' })
        }
        
        scheduleRefresh(data.session)
      }
    } catch (error) {
      console.error('[AuthProvider] Erro no refresh:', error)
      setAuthState(prev => ({ ...prev, error: 'Falha ao atualizar sess\u00e3o' }))
    }
  }

  // Agendar refresh autom\u00e1tico
  const scheduleRefresh = (session: Session) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }
    
    if (!session.expires_at) return
    
    const expiresAt = new Date(session.expires_at * 1000).getTime()
    const now = Date.now()
    const timeUntilExpiry = expiresAt - now
    const refreshAt = timeUntilExpiry - REFRESH_BEFORE_EXPIRY
    
    if (refreshAt > 0) {
      console.log(`[AuthProvider] Refresh agendado para ${Math.round(refreshAt / 1000 / 60)} minutos`)
      refreshTimerRef.current = setTimeout(() => {
        refreshSession()
      }, refreshAt)
    }
  }

  // Initialize auth state and listen for changes
  useEffect(() => {
    let mounted = true

    // Configurar sincroniza\u00e7\u00e3o de storage
    const cleanupStorage = setupStorageSync()
    
    // Configurar BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      broadcastChannelRef.current = new BroadcastChannel('auth_sync')
      
      broadcastChannelRef.current.onmessage = (event) => {
        if (event.data.type === 'SESSION_REFRESHED' && mounted) {
          console.log('[AuthProvider] Sess\u00e3o atualizada em outra aba')
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              setAuthState({
                session,
                user: session.user,
                isLoading: false,
                error: null
              })
            }
          })
        }
      }
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        let { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[AuthProvider] Erro ao obter sess\u00e3o inicial:', error)
          
          // Tentar recuperar do localStorage se n\u00e3o h\u00e1 sess\u00e3o
          if (!session) {
            const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '')}-auth-token`
            const storedData = localStorage.getItem(storageKey)
            
            if (storedData) {
              try {
                const parsed = JSON.parse(storedData)
                console.log('[AuthProvider] Tentando restaurar sess\u00e3o do localStorage')
                const { data: setData } = await supabase.auth.setSession({
                  access_token: parsed.access_token,
                  refresh_token: parsed.refresh_token
                })
                
                if (setData.session) {
                  session = setData.session
                  console.log('[AuthProvider] Sess\u00e3o restaurada com sucesso!')
                }
              } catch (e) {
                console.error('[AuthProvider] Erro ao restaurar do localStorage:', e)
              }
            }
          }
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
        console.error('[AuthProvider] Erro na inicializa\u00e7\u00e3o:', error)
        if (mounted) {
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Erro ao inicializar autentica\u00e7\u00e3o'
          }))
        }
      }
    }

    // Verificar sess\u00e3o periodicamente
    checkIntervalRef.current = setInterval(() => {
      if (mounted) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session && session.expires_at) {
            const expiresAt = new Date(session.expires_at * 1000).getTime()
            const now = Date.now()
            const timeUntilExpiry = expiresAt - now
            
            // Se falta menos de 5 minutos, fazer refresh
            if (timeUntilExpiry < REFRESH_BEFORE_EXPIRY) {
              refreshSession()
            }
          }
        })
      }
    }, REFRESH_INTERVAL)

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthProvider] Estado de auth mudou:', event)

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
          
          // Notificar outras abas
          if (broadcastChannelRef.current) {
            broadcastChannelRef.current.postMessage({ type: 'SESSION_REFRESHED' })
          }
        }
      }
    )

    getInitialSession()

    return () => {
      mounted = false
      subscription.unsubscribe()
      cleanupStorage()
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close()
      }
    }
  }, [supabase, router])

  const contextValue: AuthContextType = {
    ...authState,
    signOut,
    refreshSession
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}
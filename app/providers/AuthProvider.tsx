'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Session, User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { setupStorageSync } from '@/lib/supabase/cookie-storage'
import { syncAuthCookies } from '@/lib/supabase/cookie-sync'

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

const REFRESH_INTERVAL = 30000 // 30 segundos
const REFRESH_BEFORE_EXPIRY = 0 // Refresh exatamente quando expira (3 horas)
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
  const broadcastChannelRef = useRef<BroadcastChannel | undefined>(undefined)
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
      console.error('Error signing out:', error)
    }
  }

  const refreshSession = async (): Promise<void> => {
    try {
      console.log('[AuthProvider] Fazendo refresh da sess\u00e3o...')
      
      // Primeiro tentar refresh normal
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('[AuthProvider] Erro no refresh, tentando recuperar do localStorage:', error)
        
        // Tentar recuperar do localStorage
        const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '')}-auth-token`
        const storedData = localStorage.getItem(storageKey)
        
        if (storedData) {
          try {
            const parsed = JSON.parse(storedData)
            if (parsed.refresh_token) {
              console.log('[AuthProvider] Tentando refresh com token do localStorage')
              const { data: retryData, error: retryError } = await supabase.auth.refreshSession({
                refresh_token: parsed.refresh_token
              })
              
              if (!retryError && retryData.session) {
                setAuthState({
                  session: retryData.session,
                  user: retryData.user,
                  isLoading: false,
                  error: null
                })
                
                // Notificar outras abas
                if (broadcastChannelRef.current) {
                  broadcastChannelRef.current.postMessage({ type: 'SESSION_REFRESHED' })
                }
                
                scheduleRefresh(retryData.session)
                return
              }
            }
          } catch (e) {
            console.error('[AuthProvider] Erro ao processar localStorage:', e)
          }
        }
        
        throw error
      }
      
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
        return
      }

      handleSessionExpired('Sessão expirada. Faça login novamente.')
    } catch (error) {
      console.error('[AuthProvider] Erro no refresh:', error)
      handleSessionExpired('Sessão expirada. Faça login novamente.')
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
    const targetDelay = timeUntilExpiry - REFRESH_BEFORE_EXPIRY
    const refreshDelay = Math.max(
      Math.min(targetDelay, SESSION_REFRESH_INTERVAL_MS),
      0
    )

    if (refreshDelay > 0) {
      console.log(`[AuthProvider] Refresh agendado para ${Math.round(refreshDelay / 1000 / 60)} minutos`)
      refreshTimerRef.current = setTimeout(() => {
        refreshSession()
      }, refreshDelay)
    } else {
      console.log('[AuthProvider] Refresh imediato requerido')
      refreshSession()
    }
  }

  // Initialize auth state and listen for changes
  useEffect(() => {
    isMountedRef.current = true
    let mounted = true

    // Configurar sincroniza\u00e7\u00e3o de storage
    const cleanupStorage = setupStorageSync()
    
    // Configurar BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      broadcastChannelRef.current = new BroadcastChannel('auth_sync')
      
      broadcastChannelRef.current.onmessage = (event) => {
        if (event.data.type === 'SESSION_REFRESHED' && mounted) {
          console.log('[AuthProvider] Sess\u00e3o atualizada em outra aba')
          supabase.auth.getSession().then(({ data }: any) => {
            const { session } = data
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
        // Sincronizar cookies primeiro
        syncAuthCookies()
        
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
        supabase.auth.getSession().then(({ data }: any) => {
          const { session } = data
          if (session && session.expires_at) {
            const expiresAt = new Date(session.expires_at * 1000).getTime()
            const now = Date.now()
            const timeUntilExpiry = expiresAt - now
            
            // Se a sessão expirou, fazer refresh
            if (timeUntilExpiry < REFRESH_BEFORE_EXPIRY) {
              console.log('[AuthProvider] Heartbeat: Sessão próxima de expirar, fazendo refresh')
              refreshSession()
            } else {
              console.log('[AuthProvider] Heartbeat: Sessão válida por mais', Math.round(timeUntilExpiry / 1000 / 60), 'minutos')
            }
          } else if (!session) {
            // Se não há sessão, tentar recuperar
            console.log('[AuthProvider] Heartbeat: Sem sessão, tentando recuperar')
            refreshSession()
          }
        })
      }
    }, REFRESH_INTERVAL)

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        console.log('[AuthProvider] Estado de auth mudou:', event)

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
      isMountedRef.current = false
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

  // Fun\u00e7\u00e3o para obter sess\u00e3o atual com verifica\u00e7\u00e3o robusta
  const getSession = async (): Promise<Session | null> => {
    try {
      // Primeiro verificar o estado atual
      if (authState.session && authState.session.expires_at) {
        const expiresAt = new Date(authState.session.expires_at * 1000).getTime()
        const now = Date.now()
        
        // Se a sess\u00e3o ainda \u00e9 v\u00e1lida, retornar
        if (expiresAt > now + 60000) { // 1 minuto de margem
          return authState.session
        }
      }
      
      // Sen\u00e3o, tentar obter sess\u00e3o atualizada
      console.log('[AuthProvider] Obtendo sess\u00e3o atualizada...')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        // Tentar refresh
        await refreshSession()
        
        // Verificar novamente
        const { data: { session: newSession } } = await supabase.auth.getSession()
        return newSession
      }
      
      return session
    } catch (error) {
      console.error('[AuthProvider] Erro ao obter sess\u00e3o:', error)
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

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'

interface AuthSessionState {
  user: User | null
  session: Session | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
}

const CHECK_INTERVAL = 30000 // 30 segundos
const REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000 // 5 minutos

export function useAuthSession() {
  const [state, setState] = useState<AuthSessionState>({
    user: null,
    session: null,
    isLoading: true,
    error: null,
    isAuthenticated: false
  })
  
  const supabase = createClient()
  const refreshTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const checkIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const broadcastChannelRef = useRef<BroadcastChannel | undefined>(undefined)
  
  // Função para verificar sessão no localStorage
  const checkLocalStorageSession = useCallback(() => {
    try {
      const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '')}-auth-token`
      const storedData = localStorage.getItem(storageKey)
      
      if (storedData) {
        const parsed = JSON.parse(storedData)
        return parsed
      }
    } catch (error) {
      console.error('[AuthSession] Erro ao verificar localStorage:', error)
    }
    return null
  }, [])
  
  // Função para fazer refresh da sessão
  const refreshSession = useCallback(async () => {
    try {
      console.log('[AuthSession] Tentando refresh da sessão...')
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('[AuthSession] Erro no refresh:', error)
        
        // Tentar recuperar do localStorage
        const localSession = checkLocalStorageSession()
        if (localSession?.refresh_token) {
          console.log('[AuthSession] Tentando com token do localStorage...')
          const { data: retryData, error: retryError } = await supabase.auth.refreshSession({
            refresh_token: localSession.refresh_token
          })
          
          if (!retryError && retryData.session) {
            console.log('[AuthSession] Sessão recuperada do localStorage!')
            return retryData.session
          }
        }
        
        throw error
      }
      
      if (data.session) {
        console.log('[AuthSession] Sessão atualizada com sucesso!')
        return data.session
      }
    } catch (error) {
      console.error('[AuthSession] Falha completa no refresh:', error)
      setState(prev => ({ ...prev, error: 'Falha ao atualizar sessão' }))
    }
    
    return null
  }, [supabase, checkLocalStorageSession])
  
  // Função para agendar refresh antes da expiração
  const scheduleRefresh = useCallback((session: Session) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }
    
    if (!session.expires_at) return
    
    const expiresAt = new Date(session.expires_at * 1000).getTime()
    const now = Date.now()
    const timeUntilExpiry = expiresAt - now
    const refreshAt = timeUntilExpiry - REFRESH_BEFORE_EXPIRY
    
    if (refreshAt > 0) {
      console.log(`[AuthSession] Refresh agendado para ${Math.round(refreshAt / 1000 / 60)} minutos`)
      refreshTimerRef.current = setTimeout(async () => {
        const newSession = await refreshSession()
        if (newSession) {
          scheduleRefresh(newSession)
        }
      }, refreshAt)
    } else {
      // Se já está próximo de expirar, fazer refresh imediatamente
      refreshSession().then(newSession => {
        if (newSession) {
          scheduleRefresh(newSession)
        }
      })
    }
  }, [refreshSession])
  
  // Função para verificar e atualizar sessão
  const checkSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession()
      const session = data?.session
      const user = session?.user ?? null
      
      if (error) {
        console.error('[AuthSession] Erro ao obter sessão:', error)
        
        // Tentar recuperar do localStorage
        const localSession = checkLocalStorageSession()
        if (localSession) {
          console.log('[AuthSession] Tentando restaurar do localStorage...')
          const { data: setData, error: setError } = await supabase.auth.setSession({
            access_token: localSession.access_token,
            refresh_token: localSession.refresh_token
          })
          
          if (!setError && setData.session) {
            setState({
              user: setData.user,
              session: setData.session,
              isLoading: false,
              error: null,
              isAuthenticated: true
            })
            scheduleRefresh(setData.session)
            return
          }
        }
        
        setState({
          user: null,
          session: null,
          isLoading: false,
          error: error.message,
          isAuthenticated: false
        })
        return
      }
      
      if (session) {
        setState({
          user,
          session,
          isLoading: false,
          error: null,
          isAuthenticated: true
        })
        scheduleRefresh(session)
      } else {
        // Tentar recuperar do localStorage se não há sessão
        const localSession = checkLocalStorageSession()
        if (localSession) {
          console.log('[AuthSession] Sessão não encontrada, tentando localStorage...')
          const { data: setData } = await supabase.auth.setSession({
            access_token: localSession.access_token,
            refresh_token: localSession.refresh_token
          })
          
          if (setData.session) {
            setState({
              user: setData.user,
              session: setData.session,
              isLoading: false,
              error: null,
              isAuthenticated: true
            })
            scheduleRefresh(setData.session)
            return
          }
        }
        
        setState({
          user: null,
          session: null,
          isLoading: false,
          error: null,
          isAuthenticated: false
        })
      }
    } catch (error) {
      console.error('[AuthSession] Erro inesperado:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erro ao verificar autenticação'
      }))
    }
  }, [supabase, checkLocalStorageSession, scheduleRefresh])
  
  // Configurar BroadcastChannel para sincronização entre abas
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      broadcastChannelRef.current = new BroadcastChannel('auth_sync')
      
      broadcastChannelRef.current.onmessage = (event) => {
        if (event.data.type === 'SESSION_UPDATED') {
          console.log('[AuthSession] Sessão atualizada em outra aba')
          checkSession()
        }
      }
    }
    
    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close()
      }
    }
  }, [checkSession])
  
  // Configurar listener de mudanças de auth
  useEffect(() => {
    // Verificar sessão inicial
    checkSession()
    
    // Configurar intervalo de verificação
    checkIntervalRef.current = setInterval(checkSession, CHECK_INTERVAL)
    
    // Listener para mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AuthSession] Auth state mudou: ${event}`)
      
      if (session) {
        setState({
          user: session.user,
          session,
          isLoading: false,
          error: null,
          isAuthenticated: true
        })
        scheduleRefresh(session)
        
        // Notificar outras abas
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({ type: 'SESSION_UPDATED' })
        }
      } else {
        setState({
          user: null,
          session: null,
          isLoading: false,
          error: null,
          isAuthenticated: false
        })
        
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current)
        }
      }
    })
    
    return () => {
      subscription.unsubscribe()
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [supabase, checkSession, scheduleRefresh])
  
  return {
    ...state,
    refreshSession,
    checkSession
  }
}
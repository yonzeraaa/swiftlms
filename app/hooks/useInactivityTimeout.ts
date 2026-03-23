'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signOutAction } from '@/lib/actions/auth'

const INACTIVITY_TIMEOUT = 15 * 60 * 1000 // 15 minutos em ms
const STORAGE_KEY = 'last_activity_timestamp'
const SESSION_STORAGE_KEY = 'last_activity_session_key'
const BROADCAST_CHANNEL_NAME = 'inactivity_sync'
const IMPORT_ACTIVE_KEY = 'swiftlms_import_active'
const isDevelopment = process.env.NODE_ENV === 'development'

function debugLog(message: string, ...args: unknown[]) {
  if (!isDevelopment) return
  console.log(message, ...args)
}

function debugWarn(message: string, ...args: unknown[]) {
  if (!isDevelopment) return
  console.warn(message, ...args)
}

/**
 * Hook para logout automático por inatividade
 *
 * Funcionalidades:
 * - Monitora atividade do usuário (mouse, teclado, scroll, touch)
 * - Logout automático após 15min de inatividade
 * - Sincronização entre múltiplas abas via BroadcastChannel
 * - Tratamento especial para tabs escondidas (visibilitychange)
 */
export function useInactivityTimeout(enabled = true, sessionKey?: string | null) {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const sessionKeyRef = useRef<string | null>(sessionKey ?? null)

  useEffect(() => {
    sessionKeyRef.current = sessionKey ?? null
  }, [sessionKey])

  const syncStoredActivity = useCallback((timestamp: number) => {
    try {
      localStorage.setItem(STORAGE_KEY, timestamp.toString())

      if (sessionKeyRef.current) {
        localStorage.setItem(SESSION_STORAGE_KEY, sessionKeyRef.current)
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY)
      }
    } catch (error) {
      debugWarn('[INACTIVITY] localStorage error:', error)
    }
  }, [])

  const clearStoredActivity = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(SESSION_STORAGE_KEY)
    } catch (error) {
      debugWarn('[INACTIVITY] localStorage cleanup error:', error)
    }
  }, [])

  const performLogout = useCallback(async () => {
    if (!enabled) return

    // Don't log out while a Drive import is running — reschedule and check again later
    if (sessionStorage.getItem(IMPORT_ACTIVE_KEY)) {
      debugLog('[INACTIVITY] Import active, skipping logout and rescheduling check')
      timeoutRef.current = setTimeout(performLogout, INACTIVITY_TIMEOUT)
      return
    }

    debugLog('[INACTIVITY] Performing logout due to inactivity')

    // Limpar timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // Fazer logout no servidor
    const result = await signOutAction()

    if (result.success) {
      clearStoredActivity()

      // Só notificar outras abas após o servidor limpar a sessão,
      // evitando redirecionamentos prematuros para uma raiz ainda autenticada.
      try {
        broadcastChannelRef.current?.postMessage({ type: 'logout' })
      } catch (error) {
        debugWarn('[INACTIVITY] BroadcastChannel error:', error)
      }

      // Redirecionar para login
      router.push('/')
    } else {
      console.error('[INACTIVITY] Logout failed:', result.error)
    }
  }, [clearStoredActivity, enabled, router])

  const resetTimer = useCallback(() => {
    const now = Date.now()
    lastActivityRef.current = now

    syncStoredActivity(now)

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Criar novo timeout
    timeoutRef.current = setTimeout(() => {
      performLogout()
    }, INACTIVITY_TIMEOUT)
  }, [performLogout, syncStoredActivity])

  const handleActivity = useCallback(() => {
    resetTimer()
  }, [resetTimer])

  const handleVisibilityChange = useCallback(() => {
    if (!document.hidden) {
      // Tab voltou a ser visível - verificar se passou muito tempo
      const now = Date.now()
      const lastActivity = lastActivityRef.current
      const timeSinceLastActivity = now - lastActivity

      if (timeSinceLastActivity > INACTIVITY_TIMEOUT && !sessionStorage.getItem(IMPORT_ACTIVE_KEY)) {
        // Mais de 15min desde a última atividade e sem importação ativa - fazer logout
        debugLog('[INACTIVITY] Tab became visible after timeout period - logging out')
        performLogout()
      } else {
        // Resetar timer normalmente
        resetTimer()
      }
    }
  }, [performLogout, resetTimer])

  const handleStorageChange = useCallback((event: StorageEvent) => {
    // Sincronizar última atividade entre abas via localStorage
    if (event.key === STORAGE_KEY && event.newValue) {
      const storedSessionKey = localStorage.getItem(SESSION_STORAGE_KEY)
      if (storedSessionKey && sessionKeyRef.current && storedSessionKey !== sessionKeyRef.current) {
        return
      }

      const timestamp = parseInt(event.newValue, 10)
      if (!isNaN(timestamp)) {
        lastActivityRef.current = timestamp
        resetTimer()
      }
    }
  }, [resetTimer])

  const handleBroadcastMessage = useCallback((event: MessageEvent) => {
    // Receber comandos de outras abas
    if (event.data?.type === 'logout') {
      debugLog('[INACTIVITY] Logout command received from another tab')
      router.push('/')
    } else if (event.data?.type === 'activity') {
      // Outra aba teve atividade - resetar timer local
      lastActivityRef.current = Date.now()
      resetTimer()
    }
  }, [router, resetTimer])

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.removeEventListener('message', handleBroadcastMessage)
        broadcastChannelRef.current.close()
        broadcastChannelRef.current = null
      }

      return
    }

    // Inicializar BroadcastChannel (se suportado)
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        broadcastChannelRef.current = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
        broadcastChannelRef.current.addEventListener('message', handleBroadcastMessage)
      } catch (error) {
        debugWarn('[INACTIVITY] BroadcastChannel not available:', error)
      }
    }

    const activeSessionKey = sessionKeyRef.current
    const storedSessionKey = localStorage.getItem(SESSION_STORAGE_KEY)
    const storedTimestamp = localStorage.getItem(STORAGE_KEY)
    const isCurrentSession = Boolean(activeSessionKey) && storedSessionKey === activeSessionKey

    // Só reaproveitar o timestamp se ele pertence à mesma sessão autenticada.
    // Isso evita derrubar um login recém-criado com um valor antigo do localStorage.
    if (storedTimestamp && isCurrentSession) {
      const timestamp = parseInt(storedTimestamp, 10)
      if (!isNaN(timestamp)) {
        const now = Date.now()
        const timeSinceLastActivity = now - timestamp

        if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
          // Sessão expirada - fazer logout
          performLogout()
          return
        } else {
          lastActivityRef.current = timestamp
        }
      }
    } else {
      const now = Date.now()
      lastActivityRef.current = now
      syncStoredActivity(now)
    }

    // Iniciar timer
    resetTimer()

    // Eventos de atividade
    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Evento de visibilidade
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Evento de storage para sincronizar entre abas
    window.addEventListener('storage', handleStorageChange)

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })

      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('storage', handleStorageChange)

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.removeEventListener('message', handleBroadcastMessage)
        broadcastChannelRef.current.close()
      }
    }
  }, [enabled, handleActivity, handleVisibilityChange, handleStorageChange, handleBroadcastMessage, resetTimer, performLogout, syncStoredActivity, sessionKey])

  // Retornar função para resetar manualmente (útil para vídeos, etc)
  return { resetTimer }
}

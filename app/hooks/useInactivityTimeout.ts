'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signOutAction } from '@/lib/actions/auth'

const INACTIVITY_TIMEOUT = 15 * 60 * 1000 // 15 minutos em ms
const STORAGE_KEY = 'last_activity_timestamp'
const BROADCAST_CHANNEL_NAME = 'inactivity_sync'
const IMPORT_ACTIVE_KEY = 'swiftlms_import_active'

/**
 * Hook para logout automático por inatividade
 *
 * Funcionalidades:
 * - Monitora atividade do usuário (mouse, teclado, scroll, touch)
 * - Logout automático após 15min de inatividade
 * - Sincronização entre múltiplas abas via BroadcastChannel
 * - Tratamento especial para tabs escondidas (visibilitychange)
 */
export function useInactivityTimeout() {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)

  const performLogout = useCallback(async () => {
    // Don't log out while a Drive import is running — reschedule and check again later
    if (sessionStorage.getItem(IMPORT_ACTIVE_KEY)) {
      console.log('[INACTIVITY] Import active, skipping logout and rescheduling check')
      timeoutRef.current = setTimeout(performLogout, INACTIVITY_TIMEOUT)
      return
    }

    console.log('[INACTIVITY] Performing logout due to inactivity')

    // Limpar timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // Notificar outras abas via BroadcastChannel
    try {
      broadcastChannelRef.current?.postMessage({ type: 'logout' })
    } catch (error) {
      console.warn('[INACTIVITY] BroadcastChannel error:', error)
    }

    // Fazer logout no servidor
    const result = await signOutAction()

    if (result.success) {
      // Limpar localStorage
      localStorage.removeItem(STORAGE_KEY)

      // Redirecionar para login
      router.push('/')
    } else {
      console.error('[INACTIVITY] Logout failed:', result.error)
    }
  }, [router])

  const resetTimer = useCallback(() => {
    const now = Date.now()
    lastActivityRef.current = now

    // Atualizar timestamp no localStorage para sincronizar entre abas
    try {
      localStorage.setItem(STORAGE_KEY, now.toString())
    } catch (error) {
      console.warn('[INACTIVITY] localStorage error:', error)
    }

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Criar novo timeout
    timeoutRef.current = setTimeout(() => {
      performLogout()
    }, INACTIVITY_TIMEOUT)
  }, [performLogout])

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
        console.log('[INACTIVITY] Tab became visible after timeout period - logging out')
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
      console.log('[INACTIVITY] Logout command received from another tab')
      router.push('/')
    } else if (event.data?.type === 'activity') {
      // Outra aba teve atividade - resetar timer local
      lastActivityRef.current = Date.now()
      resetTimer()
    }
  }, [router, resetTimer])

  useEffect(() => {
    // Inicializar BroadcastChannel (se suportado)
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        broadcastChannelRef.current = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
        broadcastChannelRef.current.addEventListener('message', handleBroadcastMessage)
      } catch (error) {
        console.warn('[INACTIVITY] BroadcastChannel not available:', error)
      }
    }

    // Verificar timestamp inicial do localStorage
    const storedTimestamp = localStorage.getItem(STORAGE_KEY)
    if (storedTimestamp) {
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
  }, [handleActivity, handleVisibilityChange, handleStorageChange, handleBroadcastMessage, resetTimer, performLogout])

  // Retornar função para resetar manualmente (útil para vídeos, etc)
  return { resetTimer }
}

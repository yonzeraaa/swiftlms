'use client'

import { useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export function useAuthSession() {
  const supabase = createClient()
  const router = useRouter()
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isRefreshingRef = useRef(false)

  const scheduleTokenRefresh = useCallback((session: Session | null) => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }

    if (!session?.expires_at) return

    const expiresAt = session.expires_at * 1000
    const now = Date.now()
    const timeUntilExpiry = expiresAt - now

    // Refresh 5 minutes before expiry, or immediately if less than 5 minutes left
    const refreshIn = Math.max(0, timeUntilExpiry - 5 * 60 * 1000)

    if (refreshIn > 0) {
      console.log(`Scheduling token refresh in ${Math.round(refreshIn / 1000 / 60)} minutes`)
      
      refreshTimeoutRef.current = setTimeout(async () => {
        if (!isRefreshingRef.current) {
          isRefreshingRef.current = true
          
          try {
            console.log('Auto-refreshing session...')
            const { data, error } = await supabase.auth.refreshSession()
            
            if (error) {
              console.error('Failed to auto-refresh session:', error)
              
              // If refresh fails, redirect to login
              if (error.message?.includes('session') || error.message?.includes('refresh')) {
                router.push('/?sessionExpired=true')
              }
            } else if (data.session) {
              console.log('Session auto-refreshed successfully')
              // Schedule next refresh
              scheduleTokenRefresh(data.session)
            }
          } catch (err) {
            console.error('Error during auto-refresh:', err)
          } finally {
            isRefreshingRef.current = false
          }
        }
      }, refreshIn)
    } else {
      // Token is expired or about to expire, refresh immediately
      refreshSessionWithRetry()
    }
  }, [supabase, router])

  const refreshSessionWithRetry = useCallback(async (retries = 3, delay = 1000) => {
    if (isRefreshingRef.current) return
    
    isRefreshingRef.current = true

    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Attempting to refresh session (attempt ${i + 1}/${retries})...`)
        const { data, error } = await supabase.auth.refreshSession()

        if (!error && data.session) {
          console.log('Session refreshed successfully')
          scheduleTokenRefresh(data.session)
          isRefreshingRef.current = false
          return data.session
        }

        if (error) {
          console.error(`Refresh attempt ${i + 1} failed:`, error)
          
          // If it's the last attempt, redirect to login
          if (i === retries - 1) {
            console.error('All refresh attempts failed, redirecting to login...')
            router.push('/?sessionExpired=true')
            isRefreshingRef.current = false
            return null
          }
          
          // Wait before next retry with exponential backoff
          const waitTime = delay * Math.pow(2, i)
          console.log(`Waiting ${waitTime}ms before next retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      } catch (err) {
        console.error(`Unexpected error during refresh attempt ${i + 1}:`, err)
        
        if (i === retries - 1) {
          router.push('/?sessionExpired=true')
          isRefreshingRef.current = false
          return null
        }
        
        const waitTime = delay * Math.pow(2, i)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    isRefreshingRef.current = false
    return null
  }, [supabase, router, scheduleTokenRefresh])

  useEffect(() => {
    let mounted = true

    // Initial session check and setup
    const setupSession = async () => {
      if (!mounted) return
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          await refreshSessionWithRetry()
        } else if (session) {
          scheduleTokenRefresh(session)
        }
      } catch (err) {
        console.error('Error in session setup:', err)
      }
    }

    setupSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      console.log('Auth state changed:', event)
      
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
          scheduleTokenRefresh(session)
          break
        case 'SIGNED_OUT':
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current)
            refreshTimeoutRef.current = null
          }
          break
        case 'USER_UPDATED':
          // Handle user updates if needed
          break
      }
    })

    // Cleanup
    return () => {
      mounted = false
      subscription.unsubscribe()
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
    }
  }, [supabase, scheduleTokenRefresh, refreshSessionWithRetry])

  // Public method to manually refresh
  const manualRefresh = useCallback(async () => {
    return refreshSessionWithRetry()
  }, [refreshSessionWithRetry])

  return {
    refreshSession: manualRefresh,
  }
}
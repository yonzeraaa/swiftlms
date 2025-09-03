import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from './client'

interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
}

class SessionError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'SessionError'
  }
}

export class SessionManager {
  private static instance: SessionManager
  private supabase: SupabaseClient
  private isRefreshing = false
  private refreshPromise: Promise<any> | null = null

  private constructor() {
    this.supabase = createClient()
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async attemptSessionRefresh(): Promise<boolean> {
    if (this.isRefreshing && this.refreshPromise) {
      await this.refreshPromise
      return true
    }

    if (this.isRefreshing) return false

    this.isRefreshing = true
    
    try {
      this.refreshPromise = this.supabase.auth.refreshSession()
      const { data, error } = await this.refreshPromise
      
      if (error) {
        console.error('Session refresh failed:', error)
        this.clearAuthData()
        return false
      }

      if (!data.session) {
        console.error('No session returned after refresh')
        this.clearAuthData()
        return false
      }

      console.log('Session refreshed successfully')
      return true
    } catch (error) {
      console.error('Unexpected error during session refresh:', error)
      this.clearAuthData()
      return false
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  private clearAuthData(): void {
    try {
      if (typeof window !== 'undefined') {
        // Clear localStorage
        const authKeys = Object.keys(localStorage).filter(key => 
          key.includes('sb-') || key.includes('supabase') || key.includes('auth')
        )
        authKeys.forEach(key => {
          localStorage.removeItem(key)
          console.log(`Cleared auth key: ${key}`)
        })

        // Clear cookies
        document.cookie.split(";").forEach(cookie => {
          const eqPos = cookie.indexOf("=")
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
          if (name.includes('sb-') || name.includes('supabase') || name.includes('auth')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
          }
        })
      }
    } catch (error) {
      console.error('Error clearing auth data:', error)
    }
  }

  async ensureValidSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        
        // Try to refresh if there's an error
        const refreshSuccess = await this.attemptSessionRefresh()
        if (!refreshSuccess) {
          throw new SessionError('Failed to get or refresh session', 'SESSION_ERROR')
        }
        return true
      }

      if (!session) {
        console.log('No session found, attempting refresh...')
        
        const refreshSuccess = await this.attemptSessionRefresh()
        if (!refreshSuccess) {
          throw new SessionError('No session available and refresh failed', 'SESSION_MISSING')
        }
        return true
      }

      // Check if session is about to expire (within 5 minutes)
      if (session.expires_at) {
        const expiresAt = session.expires_at * 1000
        const now = Date.now()
        const timeUntilExpiry = expiresAt - now
        const fiveMinutes = 5 * 60 * 1000

        if (timeUntilExpiry < fiveMinutes) {
          console.log('Session expires soon, refreshing...')
          const refreshSuccess = await this.attemptSessionRefresh()
          if (!refreshSuccess) {
            console.warn('Session refresh failed but current session still valid')
          }
        }
      }

      return true
    } catch (error) {
      if (error instanceof SessionError) {
        throw error
      }
      
      console.error('Unexpected error in ensureValidSession:', error)
      throw new SessionError('Unexpected session error', 'UNEXPECTED_ERROR')
    }
  }

  async withSession<T>(
    operation: (supabase: SupabaseClient) => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = options

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Ensure we have a valid session
        await this.ensureValidSession()
        
        // Execute the operation
        return await operation(this.supabase)
      } catch (error) {
        const isLastAttempt = attempt === maxRetries - 1
        
        if (error instanceof SessionError || 
            (error as any)?.message?.includes('session') ||
            (error as any)?.message?.includes('JWT') ||
            (error as any)?.message?.includes('token')) {
          
          if (isLastAttempt) {
            console.error('All session attempts failed')
            
            // Redirect to login on final failure
            if (typeof window !== 'undefined') {
              window.location.href = '/?sessionExpired=true'
            }
            
            throw new SessionError('Authentication required - please log in again', 'AUTH_REQUIRED')
          }

          // Calculate delay with exponential backoff
          const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
          console.log(`Session error on attempt ${attempt + 1}, retrying in ${delay}ms...`)
          
          await this.delay(delay)
          continue
        }

        // If it's not a session-related error, don't retry
        throw error
      }
    }

    throw new SessionError('Max retries exceeded', 'MAX_RETRIES_EXCEEDED')
  }

  // Convenience method for simple operations
  async execute<T>(operation: (supabase: SupabaseClient) => Promise<T>): Promise<T> {
    return this.withSession(operation)
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance()

// Convenience wrapper function
export async function withValidSession<T>(
  operation: (supabase: SupabaseClient) => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  return sessionManager.withSession(operation, options)
}

// Export for backwards compatibility
export { SessionError }
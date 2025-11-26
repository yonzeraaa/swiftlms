import { createClient } from './client'
import { SupabaseClient } from '@supabase/supabase-js'

export class AuthInterceptor {
  private static instance: AuthInterceptor
  private supabase: SupabaseClient
  private refreshPromise: Promise<any> | null = null

  private constructor() {
    this.supabase = createClient()
  }

  static getInstance(): AuthInterceptor {
    if (!AuthInterceptor.instance) {
      AuthInterceptor.instance = new AuthInterceptor()
    }
    return AuthInterceptor.instance
  }

  async ensureValidSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession()
      
      if (error || !session) {
        // Try to refresh if no valid session
        if (!this.refreshPromise) {
          this.refreshPromise = this.refreshSession()
        }
        
        const result = await this.refreshPromise
        this.refreshPromise = null
        
        if (!result.session) {
          throw new Error('Unable to refresh session')
        }
        
        return result.session
      }
      
      // Check if token has expired
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
      const now = Date.now()
      const noMargin = 0
      
      if (expiresAt && (expiresAt - now) < noMargin) {
        if (!this.refreshPromise) {
          this.refreshPromise = this.refreshSession()
        }
        
        const result = await this.refreshPromise
        this.refreshPromise = null
        
        if (result.session) {
          return result.session
        }
      }
      
      return session
    } catch (error) {
      console.error('Error ensuring valid session:', error)
      throw error
    }
  }

  private async refreshSession() {
    try {
      const { data, error } = await this.supabase.auth.refreshSession()
      
      if (error) {
        console.error('Error refreshing session:', error)
        return { session: null, error }
      }
      
      return { session: data.session, error: null }
    } catch (error) {
      console.error('Unexpected error during refresh:', error)
      return { session: null, error }
    }
  }

  async withAuth<T>(operation: (supabase: SupabaseClient) => Promise<T>): Promise<T> {
    try {
      await this.ensureValidSession()
      return await operation(this.supabase)
    } catch (error) {
      // If first attempt fails due to auth, try once more after refresh
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as any).message
        if (message && (message.includes('JWT') || message.includes('token') || message.includes('auth'))) {
          console.log('Auth error detected, attempting refresh and retry...')
          await this.refreshSession()
          return await operation(this.supabase)
        }
      }
      throw error
    }
  }
}

// Export singleton instance
export const authInterceptor = AuthInterceptor.getInstance()

// Helper function for operations that require auth
export async function withAuthRetry<T>(
  operation: (supabase: SupabaseClient) => Promise<T>
): Promise<T> {
  return authInterceptor.withAuth(operation)
}
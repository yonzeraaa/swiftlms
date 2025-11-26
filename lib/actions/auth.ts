'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Get current session status from server-side (httpOnly cookies)
 *
 * SECURITY: This uses createServerClient which reads httpOnly cookies.
 * Tokens are never exposed to JavaScript. Client receives only sanitized user data.
 */
export async function getSessionStatus() {
  try {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      return {
        isAuthenticated: false,
        user: null,
        session: null
      }
    }

    // Return minimal user info (no sensitive tokens)
    return {
      isAuthenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        user_metadata: session.user.user_metadata,
      },
      session: {
        expires_at: session.expires_at,
      }
    }
  } catch (error) {
    console.error('Error getting session status:', error)
    return {
      isAuthenticated: false,
      user: null,
      session: null
    }
  }
}

/**
 * Refresh session server-side
 *
 * SECURITY: Uses httpOnly cookies, no client-side token access.
 * Updates httpOnly cookies via server client.
 */
export async function refreshSessionAction() {
  try {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.refreshSession()

    if (error || !session) {
      return {
        success: false,
        error: error?.message || 'Falha ao renovar sessão'
      }
    }

    return {
      success: true,
      expiresAt: session.expires_at
    }
  } catch (error: any) {
    console.error('Error refreshing session:', error)
    return {
      success: false,
      error: error.message || 'Erro ao renovar sessão'
    }
  }
}

/**
 * Sign out server-side
 *
 * SECURITY: Clears httpOnly cookies via server client.
 * Client never touches tokens directly.
 */
export async function signOutAction() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true
    }
  } catch (error: any) {
    console.error('Error signing out:', error)
    return {
      success: false,
      error: error.message || 'Erro ao fazer logout'
    }
  }
}

'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Set recovery session from URL tokens
 *
 * SECURITY: Uses server client to establish session with httpOnly cookies
 * Tokens never stored in localStorage
 */
export async function setRecoverySession(accessToken: string, refreshToken: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    if (error) {
      console.error('Error setting recovery session:', error)
      return { success: false, error: error.message }
    }

    return { success: true, session: data.session }
  } catch (error: any) {
    console.error('Error in setRecoverySession:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Check if recovery session is valid
 *
 * SECURITY: Reads session from httpOnly cookies
 */
export async function checkRecoverySession() {
  try {
    const supabase = await createClient()

    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      return { success: false, hasSession: false }
    }

    return { success: true, hasSession: true }
  } catch (error: any) {
    console.error('Error in checkRecoverySession:', error)
    return { success: false, hasSession: false }
  }
}

/**
 * Reset user password
 *
 * SECURITY: Uses httpOnly cookie session to authenticate password reset
 * No tokens exposed to JavaScript
 */
export async function resetUserPassword(newPassword: string) {
  try {
    const supabase = await createClient()

    // Verify user has active session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return { success: false, error: 'Sessão inválida ou expirada' }
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      console.error('Error updating password:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error in resetUserPassword:', error)
    return { success: false, error: error.message || 'Erro ao resetar senha' }
  }
}

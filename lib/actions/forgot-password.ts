'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Check if user exists and send password reset email
 *
 * SECURITY: Uses server client with httpOnly cookies
 * Validates user existence before sending reset email
 */
export async function sendPasswordResetEmail(email: string) {
  try {
    const supabase = await createClient()

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists in profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .single()

    if (profileError || !profileData) {
      console.log('User not found in profiles:', normalizedEmail)
      return {
        success: false,
        error: 'Usuário não encontrado'
      }
    }

    // Send password reset email
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
      }
    )

    if (resetError) {
      console.error('Error sending password reset email:', resetError)
      return {
        success: false,
        error: resetError.message || 'Erro ao enviar email de recuperação'
      }
    }

    console.log('Password reset email sent successfully to:', normalizedEmail)
    return { success: true }
  } catch (error: any) {
    console.error('Error in sendPasswordResetEmail:', error)
    return {
      success: false,
      error: error.message || 'Erro inesperado ao enviar email'
    }
  }
}

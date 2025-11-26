'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Get pending certificates count for admin dashboard navigation
 *
 * SECURITY: Uses server client with httpOnly cookies
 * Tokens never exposed to JavaScript
 */
export async function getPendingCertificatesCount() {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, count: 0, error: 'Not authenticated' }
    }

    // Get pending certificates count
    const { count, error } = await supabase
      .from('certificate_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (error) {
      console.error('Error fetching pending certificates count:', error)
      return { success: false, count: 0, error: error.message }
    }

    return { success: true, count: count || 0 }
  } catch (error: any) {
    console.error('Error in getPendingCertificatesCount:', error)
    return { success: false, count: 0, error: error.message || 'Unknown error' }
  }
}

/**
 * Get current user profile for dashboard
 *
 * SECURITY: Uses server client with httpOnly cookies
 * Returns only necessary user data (no tokens)
 */
export async function getDashboardUserProfile() {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      redirect('/')
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return {
        success: false,
        user: null,
        profile: null,
        error: profileError.message
      }
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      profile
    }
  } catch (error: any) {
    console.error('Error in getDashboardUserProfile:', error)
    return {
      success: false,
      user: null,
      profile: null,
      error: error.message || 'Unknown error'
    }
  }
}

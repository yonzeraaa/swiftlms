'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Get current user and profile for student dashboard
 *
 * SECURITY: Uses server client with httpOnly cookies
 * Returns only necessary user data (no tokens)
 */
export async function getStudentProfile() {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      // User not authenticated, redirect to login
      redirect('/')
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name, email, avatar_url')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching student profile:', profileError)
      return {
        success: false,
        user: null,
        profile: null,
        error: profileError.message
      }
    }

    // Verify user is a student
    if (profile.role !== 'student' && profile.role !== 'admin') {
      console.warn('Non-student user attempting to access student dashboard:', user.id)
      return {
        success: false,
        user: null,
        profile: null,
        error: 'Access denied: Not a student'
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
    console.error('Error in getStudentProfile:', error)
    return {
      success: false,
      user: null,
      profile: null,
      error: error.message || 'Unknown error'
    }
  }
}

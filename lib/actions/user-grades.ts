'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Get student profile for admin grades view
 *
 * SECURITY: Verifies current user is admin before allowing access
 * Uses server client with httpOnly cookies
 */
export async function getUserGradesProfile(userId: string) {
  try {
    const supabase = await createClient()

    // Verify current user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        success: false,
        profile: null,
        error: 'Not authenticated',
        shouldRedirect: '/login'
      }
    }

    // Verify current user is admin
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !currentProfile) {
      return {
        success: false,
        profile: null,
        error: 'Error fetching current user profile',
        shouldRedirect: '/dashboard'
      }
    }

    if (currentProfile.role !== 'admin') {
      return {
        success: false,
        profile: null,
        error: 'Not authorized - admin access required',
        shouldRedirect: '/dashboard'
      }
    }

    // Get the student's profile
    const { data: studentProfile, error: studentError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', userId)
      .single()

    if (studentError || !studentProfile) {
      console.error('Error fetching student profile:', studentError)
      return {
        success: false,
        profile: null,
        error: studentError?.message || 'Student not found',
        shouldRedirect: '/dashboard/users'
      }
    }

    return {
      success: true,
      profile: studentProfile,
      error: null,
      shouldRedirect: null
    }
  } catch (error: any) {
    console.error('Error in getUserGradesProfile:', error)
    return {
      success: false,
      profile: null,
      error: error.message || 'Unknown error',
      shouldRedirect: '/dashboard/users'
    }
  }
}

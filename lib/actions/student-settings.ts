'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface ProfileData {
  full_name: string
  email: string
  phone: string
  bio: string
  avatar_url?: string
}

/**
 * Get user profile data
 * SECURITY: Server-side only, no token exposure
 */
export async function getUserProfile(): Promise<ProfileData | null> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) return null

    return {
      full_name: profile.full_name || '',
      email: profile.email,
      phone: profile.phone || '',
      bio: profile.bio || '',
      avatar_url: profile.avatar_url || ''
    }
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

/**
 * Update user profile
 * SECURITY: Server-side only, no token exposure
 */
export async function updateUserProfile(profileData: {
  full_name: string
  phone: string
  bio: string
  avatar_url?: string
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profileData.full_name,
        phone: profileData.phone,
        bio: profileData.bio,
        avatar_url: profileData.avatar_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (error) {
      console.error('Error updating profile:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error updating profile:', error)
    return { success: false, error: error?.message || 'Erro ao atualizar perfil' }
  }
}

/**
 * Upload avatar image
 * SECURITY: Server-side only, no token exposure
 */
export async function uploadAvatar(fileData: {
  fileName: string
  fileBuffer: ArrayBuffer
  contentType: string
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    // Upload image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(`${user.id}/${fileData.fileName}`, fileData.fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: fileData.contentType
      })

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError)
      return { success: false, error: uploadError.message }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('avatars')
      .getPublicUrl(`${user.id}/${fileData.fileName}`)

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile with avatar:', updateError)
      return { success: false, error: updateError.message }
    }

    return { success: true, publicUrl }
  } catch (error: any) {
    console.error('Error uploading avatar:', error)
    return { success: false, error: error?.message || 'Erro ao fazer upload' }
  }
}

/**
 * Delete old avatar
 * SECURITY: Server-side only, no token exposure
 */
export async function deleteOldAvatar(avatarUrl: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (avatarUrl && avatarUrl.includes('supabase')) {
      const oldPath = avatarUrl.split('/').slice(-2).join('/')
      await supabase.storage.from('avatars').remove([oldPath])
    }
  } catch (error) {
    console.error('Error deleting old avatar:', error)
  }
}

/**
 * Update user password
 * SECURITY: Server-side only, no token exposure
 */
export async function updateUserPassword(newPassword: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      console.error('Error updating password:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error updating password:', error)
    return { success: false, error: error?.message || 'Erro ao atualizar senha' }
  }
}

/**
 * Export all user data
 * SECURITY: Server-side only, no token exposure
 */
export async function exportUserData() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    // Fetch all user data
    const [profile, enrollments, progress, activities] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('enrollments').select('*, course:courses(title)').eq('user_id', user.id),
      supabase.from('lesson_progress').select('*').eq('user_id', user.id),
      supabase.from('activity_logs').select('*').eq('user_id', user.id)
    ])

    const userData = {
      profile: profile.data,
      enrollments: enrollments.data,
      progress: progress.data,
      activities: activities.data,
      exportedAt: new Date().toISOString()
    }

    return { success: true, data: userData }
  } catch (error: any) {
    console.error('Error exporting user data:', error)
    return { success: false, error: error?.message || 'Erro ao exportar dados' }
  }
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getUserProfileData() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return { success: false, error: error.message, profile: null }
    }

    return { success: true, profile, userId: user.id }
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return { success: false, error: 'Erro ao buscar perfil', profile: null }
  }
}

export async function updateUserProfile(data: {
  userId: string
  full_name: string
  phone: string
  bio: string
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    // Security check: ensure user can only update their own profile
    if (user.id !== data.userId) {
      return { success: false, error: 'Não autorizado' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: data.full_name,
        phone: data.phone,
        bio: data.bio,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.userId)

    if (error) {
      console.error('Error updating profile:', error)
      return { success: false, error: 'Erro ao atualizar perfil' }
    }

    return { success: true, message: 'Perfil atualizado com sucesso' }
  } catch (error) {
    console.error('Error updating profile:', error)
    return { success: false, error: 'Erro ao atualizar perfil' }
  }
}

export async function updateUserPassword(newPassword: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    if (newPassword.length < 6) {
      return { success: false, error: 'A senha deve ter pelo menos 6 caracteres' }
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      console.error('Error updating password:', error)
      return { success: false, error: 'Erro ao alterar senha' }
    }

    return { success: true, message: 'Senha alterada com sucesso' }
  } catch (error) {
    console.error('Error updating password:', error)
    return { success: false, error: 'Erro ao alterar senha' }
  }
}

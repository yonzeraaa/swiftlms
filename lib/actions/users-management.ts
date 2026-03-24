'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Tables } from '@/lib/database.types'

type Profile = Tables<'profiles'>

export interface EnrichedProfile extends Profile {
  courses?: Array<{ id: string; title: string }>
  enrollments?: Array<{ id: string }>
  tests_created?: Array<{ id: string }>
}

/**
 * Get all users with enriched data
 * SECURITY: Server-side only, no token exposure
 */
export async function getAllUsers(): Promise<EnrichedProfile[]> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      redirect('/student-dashboard')
    }

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    const enrichedUsers: EnrichedProfile[] = await Promise.all(
      (profiles || []).map(async (profile: Tables<'profiles'>) => {
        if (profile.role === 'student') {
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_id', profile.id)

          return {
            ...profile,
            enrollments: enrollments || []
          } as EnrichedProfile
        }

        if (profile.role === 'instructor' || profile.role === 'teacher') {
          const { data: courses } = await supabase
            .from('courses')
            .select('id, title')
            .eq('instructor_id', profile.id)

          const { data: tests } = await supabase
            .from('tests')
            .select('id')
            .eq('created_by', profile.id)

          return {
            ...profile,
            courses: courses || [],
            tests_created: tests || []
          } as EnrichedProfile
        }

        return { ...profile } as EnrichedProfile
      })
    )

    return enrichedUsers
  } catch (error) {
    console.error('Error fetching users:', error)
    return []
  }
}

/**
 * Get all courses for enrollment
 * SECURITY: Server-side only, no token exposure
 */
export async function getAllCourses() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado' }

    const { data, error } = await supabase
      .from('courses')
      .select('id, title, category')
      .order('title')

    if (error) throw error

    return { success: true, courses: data || [] }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erro ao carregar cursos' }
  }
}

/**
 * Get course modules
 * SECURITY: Server-side only, no token exposure
 */
export async function getCourseModules(courseId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado' }

    const { data, error } = await supabase
      .from('course_modules')
      .select('id, title, is_required, order_index, total_hours')
      .eq('course_id', courseId)
      .order('order_index')

    if (error) throw error

    return { success: true, modules: data || [] }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erro ao carregar módulos' }
  }
}

/**
 * Create a new user
 * SECURITY: Server-side only, no token exposure
 */
export async function createNewUser(userData: {
  email: string
  password: string
  full_name: string
  phone: string
  role: 'student' | 'instructor' | 'admin'
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado' }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Sem permissão para criar usuários' }
    }

    const adminClient = createAdminClient()
    const now = new Date().toISOString()

    // Create user without mutating the current admin session cookies.
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.full_name,
        role: userData.role,
        phone: userData.phone || null
      }
    })

    if (authError) throw authError
    if (!authData.user?.id) {
      throw new Error('Falha ao criar usuário no Auth')
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: userData.email,
        full_name: userData.full_name,
        phone: userData.phone || null,
        role: userData.role,
        status: 'active',
        created_at: now,
        updated_at: now
      })

    if (profileError) throw profileError

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erro ao criar usuário' }
  }
}

/**
 * Update user status (active/frozen)
 * SECURITY: Server-side only, no token exposure
 */
export async function updateUserStatus(userId: string, status: 'active' | 'frozen') {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado' }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return { success: false, error: 'Sem permissão para atualizar usuários' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', userId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erro ao atualizar status' }
  }
}

/**
 * Update user profile
 * SECURITY: Server-side only, no token exposure
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    full_name: string
    phone: string
    role: 'student' | 'instructor' | 'admin'
  }
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado' }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Sem permissão para editar usuários' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: updates.full_name,
        phone: updates.phone,
        role: updates.role
      })
      .eq('id', userId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erro ao atualizar usuário' }
  }
}

/**
 * Log activity
 * SECURITY: Server-side only, no token exposure
 */
export async function logActivity(log: {
  action: string
  entity_type: string
  entity_id: string
  entity_name: string
  metadata?: any
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        ...log
      })
  } catch (error) {
    console.error('Error logging activity:', error)
  }
}

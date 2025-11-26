'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface GradeData {
  id: string
  title: string
  score: number
  total_points: number
  completed: boolean
  submitted_at: string | null
  subject: {
    id: string
    title: string
    course: {
      title: string
    }
  }
}

interface UserInfo {
  id: string
  fullName: string
  email: string
}

/**
 * Get current user info for grades page
 * SECURITY: Server-side only, no token exposure
 */
export async function getGradesUserInfo(): Promise<UserInfo | null> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      redirect('/')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    return {
      id: user.id,
      fullName: profile?.full_name || profile?.email || 'Aluno',
      email: profile?.email || ''
    }
  } catch (error) {
    console.error('Error fetching user info:', error)
    return null
  }
}

/**
 * Get student grades with detailed test information
 * SECURITY: Server-side only, no token exposure
 */
export async function getStudentGradesData(
  userId: string,
  dateRange?: { start: string; end: string }
): Promise<GradeData[]> {
  try {
    const supabase = await createClient()

    // Verify the requesting user matches or is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Only allow viewing own grades or admin viewing others
    if (user.id !== userId && profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return []
    }

    let query = supabase
      .from('test_attempts')
      .select(`
        id,
        score,
        submitted_at,
        tests!inner (
          id,
          title,
          total_points,
          subjects!inner (
            id,
            title,
            courses!inner (
              title
            )
          )
        )
      `)
      .eq('student_id', userId)
      .order('submitted_at', { ascending: false })

    // Apply date range filter if provided
    if (dateRange) {
      query = query
        .gte('submitted_at', `${dateRange.start}T00:00:00`)
        .lte('submitted_at', `${dateRange.end}T23:59:59`)
    }

    const { data: attempts, error } = await query

    if (error) {
      console.error('Error fetching grades:', error)
      return []
    }

    // Transform to flat structure
    return (attempts || []).map((attempt: any) => ({
      id: attempt.id,
      title: attempt.tests.title,
      score: attempt.score || 0,
      total_points: attempt.tests.total_points || 100,
      completed: !!attempt.submitted_at,
      submitted_at: attempt.submitted_at,
      subject: {
        id: attempt.tests.subjects.id,
        title: attempt.tests.subjects.title,
        course: {
          title: attempt.tests.subjects.courses.title
        }
      }
    }))
  } catch (error) {
    console.error('Error in getStudentGradesData:', error)
    return []
  }
}

/**
 * Get grade overrides for a student
 * SECURITY: Server-side only, no token exposure
 */
export async function getGradeOverrides(userId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: overrides } = await supabase
      .from('student_grade_overrides')
      .select('*')
      .eq('user_id', userId)
      .single()

    return overrides
  } catch (error) {
    console.error('Error fetching overrides:', error)
    return null
  }
}

/**
 * Get TCC grade for a student
 * SECURITY: Server-side only, no token exposure
 */
export async function getTCCGrade(userId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: tccAttempt } = await supabase
      .from('tcc_submissions')
      .select('grade')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .single()

    return tccAttempt?.grade || null
  } catch (error) {
    // TCC might not exist, that's okay
    return null
  }
}

/**
 * Save grade overrides for a student
 * SECURITY: Server-side only, no token exposure
 */
export async function saveGradeOverrides(payload: {
  user_id: string
  tests_average_override: number | null
  tests_weight: number
  tcc_grade_override: number | null
  tcc_weight: number
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    // Check if user is admin or instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return { success: false, error: 'Sem permissão para modificar ajustes' }
    }

    const { error } = await supabase
      .from('student_grade_overrides')
      .upsert(payload, { onConflict: 'user_id' })

    if (error) {
      console.error('Erro ao salvar ajustes:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Erro ao salvar ajustes de nota:', error)
    return { success: false, error: error?.message || 'Erro desconhecido' }
  }
}

/**
 * Reset grade overrides for a student
 * SECURITY: Server-side only, no token exposure
 */
export async function resetGradeOverrides(userId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    // Check if user is admin or instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return { success: false, error: 'Sem permissão para remover ajustes' }
    }

    const { error } = await supabase
      .from('student_grade_overrides')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('Erro ao remover ajustes:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Erro ao remover ajustes de nota:', error)
    return { success: false, error: error?.message || 'Erro desconhecido' }
  }
}

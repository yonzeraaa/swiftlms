'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Get test for taking
 * SECURITY: Server-side only, no token exposure
 */
export async function getTestForTaking(testId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    // Get test details
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single()

    if (testError) throw testError

    if (!test.course_id) {
      return { success: false, error: 'Teste não associado a um curso' }
    }

    // Check enrollment
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', test.course_id)
      .single()

    if (!enrollment) {
      return { success: false, error: 'Você não está matriculado neste curso' }
    }

    // Check existing attempts
    const { data: attempts, error: attemptsError } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('test_id', testId)
      .order('created_at', { ascending: false })

    if (attemptsError) throw attemptsError

    return {
      success: true,
      test,
      enrollment,
      attempts: attempts || []
    }
  } catch (error: any) {
    console.error('Error fetching test:', error)
    return { success: false, error: error?.message || 'Erro ao carregar teste' }
  }
}

/**
 * Get test results
 * SECURITY: Server-side only, no token exposure
 */
export async function getTestResults(testId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    // Get test details
    const { data: test } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single()

    // Get latest attempt
    const { data: attempt } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('test_id', testId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Get overall grade
    const { data: grade } = await supabase
      .from('test_grades')
      .select('*')
      .eq('user_id', user.id)
      .eq('test_id', testId)
      .single()

    return {
      test,
      attempt,
      grade
    }
  } catch (error) {
    console.error('Error fetching test results:', error)
    return null
  }
}

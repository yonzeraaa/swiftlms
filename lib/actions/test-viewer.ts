'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Get test answer key for a specific test
 *
 * SECURITY: Uses server client with httpOnly cookies
 * Returns answer key metadata for test viewer
 */
export async function getTestAnswerKey(testId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('test_answer_keys')
      .select('question_number, correct_answer')
      .eq('test_id', testId)
      .order('question_number', { ascending: false })

    if (error) {
      console.error('Error fetching test answer key:', error)
      return {
        success: false,
        data: null,
        error: error.message
      }
    }

    return {
      success: true,
      data: data || [],
      error: null
    }
  } catch (error: any) {
    console.error('Error in getTestAnswerKey:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Unknown error'
    }
  }
}

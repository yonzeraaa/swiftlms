'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getStudentSchedules() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/')

    const { data: schedulesData, error } = await supabase
      .from('student_schedules')
      .select(`
        *,
        subject:subjects(name, code)
      `)
      .eq('user_id', user.id)
      .order('weekday')
      .order('start_time')

    if (error) throw error

    return { success: true, schedules: schedulesData || [] }
  } catch (error: any) {
    console.error('Error fetching schedules:', error)
    return { success: false, error: error.message || 'Erro ao buscar horários', schedules: [] }
  }
}

export async function getAvailableSubjects() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/')

    const { data: subjectsData, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name')

    if (error) throw error

    return { success: true, subjects: subjectsData || [] }
  } catch (error: any) {
    console.error('Error fetching subjects:', error)
    return { success: false, error: error.message || 'Erro ao buscar disciplinas', subjects: [] }
  }
}

export async function addStudentSchedule(scheduleData: {
  subject_id: string
  weekday: number
  start_time: string
  end_time: string
  location: string | null
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('student_schedules')
      .insert({
        user_id: user.id,
        subject_id: scheduleData.subject_id,
        weekday: scheduleData.weekday,
        start_time: scheduleData.start_time,
        end_time: scheduleData.end_time,
        location: scheduleData.location || null
      })

    if (error) {
      if (error.message.includes('duplicate key')) {
        return { success: false, error: 'Já existe um horário cadastrado para esta disciplina neste dia e horário' }
      }
      throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error adding schedule:', error)
    return { success: false, error: error.message || 'Erro ao adicionar horário' }
  }
}

export async function deleteStudentSchedule(scheduleId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('student_schedules')
      .delete()
      .eq('id', scheduleId)
      .eq('user_id', user.id) // Garantir que o usuário só pode deletar seus próprios horários

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting schedule:', error)
    return { success: false, error: error.message || 'Erro ao remover horário' }
  }
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getModulesData() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      redirect('/student-dashboard')
    }

    const { data: modulesData, error: modulesError } = await supabase
      .from('course_modules')
      .select('*, courses!inner(id, title)')
      .order('order_index')

    if (modulesError) throw modulesError

    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .order('title')

    if (coursesError) throw coursesError

    if (modulesData && modulesData.length > 0) {
      const { data: moduleSubjects } = await supabase
        .from('module_subjects')
        .select('module_id')

      const stats: { [key: string]: { subjects: number } } = {}
      modulesData.forEach((module: any) => {
        const subjectCount = moduleSubjects?.filter((ms: any) => ms.module_id === module.id).length || 0
        stats[module.id] = { subjects: subjectCount }
      })

      return {
        modules: modulesData || [],
        courses: coursesData || [],
        moduleStats: stats
      }
    }

    return {
      modules: modulesData || [],
      courses: coursesData || [],
      moduleStats: {}
    }
  } catch (error) {
    console.error('Error fetching modules data:', error)
    return null
  }
}

export async function createModule(moduleData: {
  title: string
  description?: string
  course_id: string
  order_index: number
  is_required: boolean
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('course_modules')
      .insert({
        title: moduleData.title,
        description: moduleData.description || null,
        course_id: moduleData.course_id,
        order_index: moduleData.order_index,
        is_required: moduleData.is_required
      })

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error creating module:', error)
    return { success: false, error: error.message || 'Erro ao criar módulo' }
  }
}

export async function updateModule(moduleId: string, moduleData: {
  title: string
  description?: string
  course_id: string
  order_index: number
  is_required: boolean
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('course_modules')
      .update({
        title: moduleData.title,
        description: moduleData.description || null,
        course_id: moduleData.course_id,
        order_index: moduleData.order_index,
        is_required: moduleData.is_required,
        updated_at: new Date().toISOString()
      })
      .eq('id', moduleId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error updating module:', error)
    return { success: false, error: error.message || 'Erro ao atualizar módulo' }
  }
}

export async function deleteModule(moduleId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('course_modules')
      .delete()
      .eq('id', moduleId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting module:', error)
    return { success: false, error: error.message || 'Erro ao deletar módulo' }
  }
}

export async function bulkDeleteModules(moduleIds: string[]) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { error } = await supabase
      .from('course_modules')
      .delete()
      .in('id', moduleIds)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error bulk deleting modules:', error)
    return { success: false, error: error.message || 'Erro ao deletar módulos' }
  }
}

export async function updateModulesOrder(modules: Array<{ id: string; order_index: number }>) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const tempUpdates = modules.map((module, index) =>
      supabase
        .from('course_modules')
        .update({
          order_index: 100000 + index,
          updated_at: new Date().toISOString()
        })
        .eq('id', module.id)
        .select()
    )

    const tempResults = await Promise.all(tempUpdates)
    const tempErrors = tempResults.filter(r => r.error)
    if (tempErrors.length > 0) {
      throw new Error(`Failed to update temporary indices: ${tempErrors[0].error?.message || 'Unknown error'}`)
    }

    const finalUpdates = modules.map((module, index) =>
      supabase
        .from('course_modules')
        .update({
          order_index: index,
          updated_at: new Date().toISOString()
        })
        .eq('id', module.id)
        .select()
    )

    const finalResults = await Promise.all(finalUpdates)
    const finalErrors = finalResults.filter(r => r.error)
    if (finalErrors.length > 0) {
      throw new Error(`Failed to update final indices: ${finalErrors[0].error?.message || 'Unknown error'}`)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error updating modules order:', error)
    return { success: false, error: error.message || 'Erro ao atualizar ordem' }
  }
}

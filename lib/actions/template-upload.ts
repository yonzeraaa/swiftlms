'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Deleta arquivo de template do storage
 */
export async function deleteTemplateFile(storagePath: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.storage
      .from('excel-templates')
      .remove([storagePath])

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Erro ao deletar arquivo de template:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Faz upload de arquivo de template para o storage
 */
export async function uploadTemplateFile(
  file: File,
  fileName: string
): Promise<{ success: boolean; data?: { path: string }; error?: string }> {
  try {
    const supabase = await createClient()

    // Converter File para ArrayBuffer e depois para Uint8Array
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    const { data, error } = await supabase.storage
      .from('excel-templates')
      .upload(fileName, fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: { path: data.path } }
  } catch (error: any) {
    console.error('Erro ao fazer upload de template:', error)
    return { success: false, error: error.message }
  }
}

export interface UpdateTemplateData {
  name: string
  description: string | null
  category: string
  storage_path?: string
  metadata?: any
}

/**
 * Atualiza registro de template no banco de dados
 */
export async function updateTemplate(id: string, data: UpdateTemplateData) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('excel_templates')
      .update(data)
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Erro ao atualizar template:', error)
    return { success: false, error: error.message }
  }
}

export interface CreateTemplateData {
  name: string
  description: string | null
  category: string
  storage_path: string
  storage_bucket: string
  created_by: string
  is_active: boolean
  metadata: any
}

/**
 * Cria novo registro de template no banco de dados
 */
export async function createTemplate(data: CreateTemplateData) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('excel_templates').insert(data)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Erro ao criar template:', error)
    return { success: false, error: error.message }
  }
}

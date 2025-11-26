'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface ExcelTemplate {
  id: string
  name: string
  description: string | null
  category: string
  storage_path: string
  storage_bucket: string
  is_active: boolean
  created_at: string
  created_by: string
  metadata: any
}

export async function getTemplates() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('excel_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao carregar templates:', error)
    throw new Error('Erro ao carregar templates')
  }

  return data || []
}

export async function deleteTemplate(templateId: string) {
  const supabase = await createClient()

  const { data: template, error: fetchError } = await supabase
    .from('excel_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (fetchError || !template) {
    throw new Error('Template não encontrado')
  }

  const bucket = template.storage_bucket || 'excel-templates'

  const { error: storageError } = await supabase.storage
    .from(bucket)
    .remove([template.storage_path])

  if (storageError) {
    throw new Error(`Erro ao deletar arquivo: ${storageError.message}`)
  }

  const { error: dbError } = await supabase
    .from('excel_templates')
    .delete()
    .eq('id', templateId)

  if (dbError) {
    throw new Error(`Erro ao deletar registro: ${dbError.message}`)
  }

  revalidatePath('/dashboard/templates')
}

export async function getTemplateDownloadUrl(templateId: string) {
  const supabase = await createClient()

  const { data: template, error: fetchError } = await supabase
    .from('excel_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (fetchError || !template) {
    throw new Error('Template não encontrado')
  }

  const bucket = template.storage_bucket || 'excel-templates'

  const { data, error } = await supabase.storage
    .from(bucket)
    .download(template.storage_path)

  if (error) {
    throw new Error(`Erro ao gerar URL de download: ${error.message}`)
  }

  return { blob: data, name: template.name }
}

export async function getTemplatePreviewUrl(templateId: string) {
  const supabase = await createClient()

  const { data: template, error: fetchError } = await supabase
    .from('excel_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (fetchError || !template) {
    throw new Error('Template não encontrado')
  }

  const bucket = template.storage_bucket || 'excel-templates'

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(template.storage_path, 60)

  if (error || !data?.signedUrl) {
    throw new Error('Não foi possível gerar o link de visualização')
  }

  return data.signedUrl
}

export async function duplicateTemplate(templateId: string, userId: string) {
  const supabase = await createClient()

  const { data: template, error: fetchError } = await supabase
    .from('excel_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (fetchError || !template) {
    throw new Error('Template não encontrado')
  }

  const bucket = template.storage_bucket || 'excel-templates'
  const timestamp = Date.now()

  const pathParts = template.storage_path.split('/')
  const originalFileName = pathParts.pop() || template.storage_path
  const extensionIndex = originalFileName.lastIndexOf('.')
  const extension = extensionIndex !== -1 ? originalFileName.slice(extensionIndex) : ''
  const baseName = extensionIndex !== -1 ? originalFileName.slice(0, extensionIndex) : originalFileName
  const directory = pathParts.join('/')
  const newFileName = `${baseName}_copia_${timestamp}${extension}`
  const newStoragePath = directory ? `${directory}/${newFileName}` : newFileName

  const { error: copyError } = await supabase.storage
    .from(bucket)
    .copy(template.storage_path, newStoragePath)

  if (copyError) {
    throw new Error(`Erro ao copiar arquivo: ${copyError.message}`)
  }

  const { error: insertError } = await supabase
    .from('excel_templates')
    .insert({
      name: `${template.name} (Cópia)`,
      description: template.description,
      category: template.category,
      storage_path: newStoragePath,
      storage_bucket: bucket,
      created_by: userId,
      is_active: template.is_active,
      metadata: template.metadata,
    })

  if (insertError) {
    await supabase.storage.from(bucket).remove([newStoragePath])
    throw new Error(`Erro ao criar registro do template: ${insertError.message}`)
  }

  revalidatePath('/dashboard/templates')
}

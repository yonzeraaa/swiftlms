'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  CertificateDocxTemplate,
  CertificateKind,
  FieldMapping,
  DocxPlaceholder,
} from '@/types/certificate-docx'
import { generateCertificateDocx, certificateToDocxData } from '@/lib/services/certificate-docx'

/**
 * Upload e analisa um template DOCX
 */
export async function uploadCertificateDocxTemplate(
  file: File,
  name: string,
  description: string | null,
  certificateKind: CertificateKind,
  userId: string
) {
  const supabase = await createClient()

  // Verificar se é DOCX
  if (!file.name.endsWith('.docx')) {
    throw new Error('Apenas arquivos .docx são suportados')
  }

  // Analisar template para extrair placeholders
  const formData = new FormData()
  formData.append('file', file)

  const analysisResponse = await fetch('/api/analyze-docx-template', {
    method: 'POST',
    body: formData,
  })

  if (!analysisResponse.ok) {
    throw new Error('Erro ao analisar template')
  }

  const analysis = await analysisResponse.json()

  if (!analysis.success) {
    throw new Error(analysis.error || 'Erro ao analisar template')
  }

  // Upload do arquivo para storage
  const timestamp = Date.now()
  const fileName = `${timestamp}_${file.name}`
  const storagePath = `certificate-docx/${fileName}`

  const arrayBuffer = await file.arrayBuffer()
  const fileBuffer = Buffer.from(arrayBuffer)

  const { error: uploadError } = await supabase.storage
    .from('excel-templates')
    .upload(storagePath, fileBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Erro ao fazer upload: ${uploadError.message}`)
  }

  // Criar registro no banco
  const { error: insertError } = await supabase
    .from('excel_templates')
    .insert({
      name,
      description,
      category: 'certificate-docx',
      certificate_kind: certificateKind,
      storage_path: storagePath,
      storage_bucket: 'excel-templates',
      created_by: userId,
      is_active: true,
      placeholders: analysis.placeholders,
      validation_warnings: analysis.warnings.length > 0 ? analysis.warnings : null,
      metadata: {
        version: '1.0',
        mappings: analysis.suggestions,
      },
    })

  if (insertError) {
    // Rollback: deletar arquivo do storage
    await supabase.storage.from('excel-templates').remove([storagePath])
    throw new Error(`Erro ao criar template: ${insertError.message}`)
  }

  revalidatePath('/dashboard/templates')

  return {
    success: true,
    placeholders: analysis.placeholders,
    warnings: analysis.warnings,
  }
}

/**
 * Busca templates DOCX filtrados por tipo
 */
export async function getCertificateDocxTemplates(
  certificateKind?: CertificateKind
): Promise<CertificateDocxTemplate[]> {
  const supabase = await createClient()

  let query = supabase
    .from('excel_templates')
    .select('*')
    .eq('category', 'certificate-docx')
    .order('created_at', { ascending: false })

  if (certificateKind && certificateKind !== 'all') {
    query = query.in('certificate_kind', [certificateKind, 'all'])
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao carregar templates DOCX:', error)
    throw new Error('Erro ao carregar templates')
  }

  return (data || []) as unknown as CertificateDocxTemplate[]
}

/**
 * Atualiza os mapeamentos de campos de um template
 */
export async function updateTemplateMappings(
  templateId: string,
  mappings: FieldMapping[]
) {
  const supabase = await createClient()

  // Buscar template atual
  const { data: template, error: fetchError } = await supabase
    .from('excel_templates')
    .select('metadata')
    .eq('id', templateId)
    .single()

  if (fetchError || !template) {
    throw new Error('Template não encontrado')
  }

  // Atualizar metadata com novos mappings
  const currentMetadata = (template.metadata as any) || {}
  const updatedMetadata = {
    ...currentMetadata,
    mappings,
  }

  const { error: updateError } = await supabase
    .from('excel_templates')
    .update({ metadata: updatedMetadata })
    .eq('id', templateId)

  if (updateError) {
    throw new Error(`Erro ao atualizar mapeamentos: ${updateError.message}`)
  }

  revalidatePath('/dashboard/templates')

  return { success: true }
}

/**
 * Ativa/desativa um template
 */
export async function toggleTemplateActive(templateId: string, isActive: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('excel_templates')
    .update({ is_active: isActive })
    .eq('id', templateId)

  if (error) {
    throw new Error(`Erro ao atualizar status: ${error.message}`)
  }

  revalidatePath('/dashboard/templates')

  return { success: true }
}

/**
 * Gera certificado a partir de um template
 */
export async function generateCertificateFromTemplate(
  templateId: string,
  certificateId: string
): Promise<Buffer> {
  const supabase = await createClient()

  // Buscar dados do certificado
  const { data: certificate, error: certError } = await supabase
    .from('certificates')
    .select(`
      *,
      user:profiles!certificates_user_id_fkey(full_name, cpf, rg, email),
      course:courses!certificates_course_id_fkey(title, duration_hours, start_date, end_date)
    `)
    .eq('id', certificateId)
    .single()

  if (certError || !certificate) {
    throw new Error('Certificado não encontrado')
  }

  // Converter para formato DOCX
  const certificateData = certificateToDocxData(certificate)

  // Gerar documento
  const buffer = await generateCertificateDocx(templateId, certificateData)

  return buffer
}

/**
 * Busca um template específico
 */
export async function getCertificateDocxTemplate(
  templateId: string
): Promise<CertificateDocxTemplate | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('excel_templates')
    .select('*')
    .eq('id', templateId)
    .eq('category', 'certificate-docx')
    .single()

  if (error) {
    console.error('Erro ao buscar template:', error)
    return null
  }

  return data as unknown as CertificateDocxTemplate
}

/**
 * Baixa template DOCX como arquivo
 */
export async function downloadCertificateDocxTemplate(templateId: string) {
  const supabase = await createClient()

  const { data: template, error: fetchError } = await supabase
    .from('excel_templates')
    .select('*')
    .eq('id', templateId)
    .eq('category', 'certificate-docx')
    .single()

  if (fetchError || !template) {
    throw new Error('Template não encontrado')
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from(template.storage_bucket)
    .download(template.storage_path)

  if (downloadError || !fileData) {
    throw new Error(`Erro ao baixar template: ${downloadError?.message}`)
  }

  return {
    blob: fileData,
    name: `${template.name}.docx`,
  }
}

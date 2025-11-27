'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  CertificateDocxTemplate,
  CertificateKind,
  FieldMapping,
  DocxPlaceholder,
  validateFieldMappings,
} from '@/types/certificate-docx'
import { generateCertificateDocx, generateCertificatePdf, certificateToDocxData } from '@/lib/services/certificate-docx'
import { isDocxToPdfAvailable } from '@/lib/services/docx-to-pdf'

/**
 * Upload temporário de arquivo DOCX para análise
 * Usado para contornar limite de payload do Vercel
 */
export async function uploadDocxForAnalysis(
  file: File
): Promise<{ success: boolean; storagePath?: string; error?: string }> {
  try {
    const supabase = await createClient()

    if (!file.name.endsWith('.docx')) {
      return { success: false, error: 'Apenas arquivos .docx são suportados' }
    }

    const timestamp = Date.now()
    const uniqueId = crypto.randomUUID()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `temp-analysis/${timestamp}_${uniqueId}_${sanitizedName}`

    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('excel-templates')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false,
      })

    if (uploadError) {
      return { success: false, error: `Erro no upload: ${uploadError.message}` }
    }

    return { success: true, storagePath }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return { success: false, error: msg }
  }
}

/**
 * Remove arquivo temporário de análise
 */
export async function deleteDocxAnalysisFile(
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.storage
      .from('excel-templates')
      .remove([storagePath])

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return { success: false, error: msg }
  }
}

/**
 * Upload e analisa um template DOCX
 * Se tempStoragePath fornecido, move o arquivo de temp para certificate-docx/
 */
export async function uploadCertificateDocxTemplate(
  file: File,
  name: string,
  description: string | null,
  certificateKind: CertificateKind,
  userId: string,
  tempStoragePath?: string
) {
  const supabase = await createClient()

  if (!file.name.endsWith('.docx')) {
    throw new Error('Apenas arquivos .docx são suportados')
  }

  // Definir caminho final
  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `certificate-docx/${timestamp}_${sanitizedName}`

  let fileBuffer: Buffer

  if (tempStoragePath) {
    // Se já existe arquivo temporário, baixar e mover
    const { data: tempFile, error: downloadError } = await supabase.storage
      .from('excel-templates')
      .download(tempStoragePath)

    if (downloadError || !tempFile) {
      throw new Error(`Erro ao acessar arquivo temporário: ${downloadError?.message}`)
    }

    const arrayBuffer = await tempFile.arrayBuffer()
    fileBuffer = Buffer.from(arrayBuffer)

    // Upload no local definitivo
    const { error: uploadError } = await supabase.storage
      .from('excel-templates')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Erro ao fazer upload: ${uploadError.message}`)
    }

    // Deletar arquivo temporário
    await supabase.storage.from('excel-templates').remove([tempStoragePath])
  } else {
    // Upload direto do arquivo
    const arrayBuffer = await file.arrayBuffer()
    fileBuffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('excel-templates')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Erro ao fazer upload: ${uploadError.message}`)
    }
  }

  // Extrair placeholders diretamente do buffer
  const { extractPlaceholdersFromBuffer } = await import('@/lib/docx-parser')
  const { CERTIFICATE_DOCX_FIELDS } = await import('@/types/certificate-docx')

  const { placeholders, warnings } = extractPlaceholdersFromBuffer(fileBuffer)

  // Gerar sugestões de mapeamento
  const suggestions: FieldMapping[] = placeholders.map((placeholder) => {
    const knownField = CERTIFICATE_DOCX_FIELDS[placeholder.name as keyof typeof CERTIFICATE_DOCX_FIELDS]
    if (knownField) {
      return {
        placeholder: placeholder.name,
        source: placeholder.name,
        transform: placeholder.format as FieldMapping['transform'],
      }
    }
    return {
      placeholder: placeholder.name,
      source: '',
      fixedValue: '',
    }
  })

  // Criar registro no banco
  const { data: insertedTemplate, error: insertError } = await supabase
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
      placeholders,
      validation_warnings: warnings.length > 0 ? warnings : null,
      metadata: {
        version: '1.0',
        mappings: JSON.parse(JSON.stringify(suggestions)),
      },
    })
    .select('id')
    .single()

  if (insertError || !insertedTemplate) {
    await supabase.storage.from('excel-templates').remove([storagePath])
    throw new Error(`Erro ao criar template: ${insertError?.message || 'Erro desconhecido'}`)
  }

  revalidatePath('/dashboard/templates')

  return {
    success: true,
    templateId: insertedTemplate.id,
    placeholders,
    warnings,
    mappings: suggestions,
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

  // Validar mapeamentos
  const validation = validateFieldMappings(mappings)
  if (!validation.success) {
    throw new Error(`Mapeamento inválido: ${validation.error.issues.map(e => e.message).join(', ')}`)
  }

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
 * Gera certificado em PDF a partir de um template
 */
export async function generateCertificatePdfFromTemplate(
  templateId: string,
  certificateId: string
): Promise<Buffer> {
  if (!isDocxToPdfAvailable()) {
    throw new Error('Conversão para PDF não disponível neste servidor')
  }

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

  // Gerar PDF
  const buffer = await generateCertificatePdf(templateId, certificateData)

  return buffer
}

/**
 * Verifica se a conversão para PDF está disponível
 */
export async function checkPdfConversionAvailable(): Promise<boolean> {
  return isDocxToPdfAvailable()
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

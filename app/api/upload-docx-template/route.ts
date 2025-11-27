import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractPlaceholdersFromBuffer } from '@/lib/docx-parser'
import { revalidatePath } from 'next/cache'
import {
  CERTIFICATE_DOCX_FIELDS,
  FieldMapping,
  CertificateKind,
} from '@/types/certificate-docx'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * POST /api/upload-docx-template
 * Faz upload de um template DOCX a partir do Storage temporário
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tempStoragePath,
      name,
      description,
      certificateKind,
      userId,
      fileName,
    } = body as {
      tempStoragePath: string
      name: string
      description: string | null
      certificateKind: CertificateKind
      userId: string
      fileName: string
    }

    if (!tempStoragePath || !name || !userId || !fileName) {
      return NextResponse.json(
        { success: false, error: 'Parâmetros obrigatórios não informados' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Baixar arquivo temporário
    const { data: tempFile, error: downloadError } = await supabase.storage
      .from('excel-templates')
      .download(tempStoragePath)

    if (downloadError || !tempFile) {
      return NextResponse.json(
        { success: false, error: `Erro ao acessar arquivo: ${downloadError?.message}` },
        { status: 400 }
      )
    }

    const arrayBuffer = await tempFile.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Mover para local definitivo
    const timestamp = Date.now()
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `certificate-docx/${timestamp}_${sanitizedName}`

    const { error: uploadError } = await supabase.storage
      .from('excel-templates')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: `Erro ao fazer upload: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Deletar arquivo temporário
    await supabase.storage.from('excel-templates').remove([tempStoragePath])

    // Extrair placeholders
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
      // Rollback
      await supabase.storage.from('excel-templates').remove([storagePath])
      return NextResponse.json(
        { success: false, error: `Erro ao criar template: ${insertError?.message}` },
        { status: 500 }
      )
    }

    revalidatePath('/dashboard/templates')

    return NextResponse.json({
      success: true,
      templateId: insertedTemplate.id,
      placeholders,
      warnings,
      mappings: suggestions,
    })
  } catch (error: unknown) {
    console.error('Erro ao fazer upload de template DOCX:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer upload'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractPlaceholdersFromBuffer } from '@/lib/docx-parser'
import { CERTIFICATE_DOCX_FIELDS, FieldMapping, DocxPlaceholder } from '@/types/certificate-docx'

// Usar Node.js runtime para suportar arquivos maiores
export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * Gera sugestões de mapeamento baseadas nos campos conhecidos
 */
function generateMappingSuggestions(placeholders: DocxPlaceholder[]): FieldMapping[] {
  const suggestions: FieldMapping[] = []

  placeholders.forEach((placeholder) => {
    const knownField = CERTIFICATE_DOCX_FIELDS[placeholder.name as keyof typeof CERTIFICATE_DOCX_FIELDS]

    if (knownField) {
      suggestions.push({
        placeholder: placeholder.name,
        source: placeholder.name,
        transform: placeholder.format as FieldMapping['transform'],
      })
    } else {
      suggestions.push({
        placeholder: placeholder.name,
        source: '',
        fixedValue: '',
      })
    }
  })

  return suggestions
}

/**
 * POST /api/analyze-docx-template
 * Analisa um template DOCX - aceita path do Storage ou FormData
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let buffer: Buffer

    // Se JSON, buscar arquivo do Storage
    if (contentType.includes('application/json')) {
      const body = await request.json()
      const { storagePath } = body

      if (!storagePath) {
        return NextResponse.json(
          { success: false, error: 'Caminho do arquivo não informado' },
          { status: 400 }
        )
      }

      const supabase = await createClient()
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('excel-templates')
        .download(storagePath)

      if (downloadError || !fileData) {
        return NextResponse.json(
          { success: false, error: `Erro ao baixar arquivo: ${downloadError?.message}` },
          { status: 400 }
        )
      }

      const arrayBuffer = await fileData.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else {
      // FormData tradicional (mantido para compatibilidade com arquivos pequenos)
      const formData = await request.formData()
      const file = formData.get('file') as File

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'Nenhum arquivo enviado' },
          { status: 400 }
        )
      }

      if (!file.name.endsWith('.docx')) {
        return NextResponse.json(
          { success: false, error: 'Apenas arquivos .docx são suportados' },
          { status: 400 }
        )
      }

      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    }

    // Extrair placeholders
    const { placeholders, warnings } = extractPlaceholdersFromBuffer(buffer)
    const suggestions = generateMappingSuggestions(placeholders)

    return NextResponse.json({
      success: true,
      placeholders,
      warnings,
      suggestions,
    })
  } catch (error: unknown) {
    console.error('Erro ao analisar template DOCX:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro ao analisar template'
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}

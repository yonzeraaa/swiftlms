import { NextRequest, NextResponse } from 'next/server'
import { extractPlaceholdersFromBuffer } from '@/lib/docx-parser'
import { CERTIFICATE_DOCX_FIELDS, FieldMapping, DocxPlaceholder } from '@/types/certificate-docx'

// Usar Node.js runtime para suportar arquivos maiores (até 50MB)
export const runtime = 'nodejs'

// Configurar limite de tamanho do body (10MB)
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
        transform: placeholder.format as any,
      })
    } else {
      // Campo desconhecido, sugerir mapeamento manual
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
 * Analisa um template DOCX e extrai placeholders
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Verificar se é um arquivo DOCX
    if (!file.name.endsWith('.docx')) {
      return NextResponse.json(
        { success: false, error: 'Apenas arquivos .docx são suportados' },
        { status: 400 }
      )
    }

    // Converter para buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extrair placeholders usando o novo parser robusto
    const { placeholders, warnings } = extractPlaceholdersFromBuffer(buffer)

    // Gerar sugestões de mapeamento
    const suggestions = generateMappingSuggestions(placeholders)

    // Avisos de campos obrigatórios já são gerados pelo parser em extractPlaceholdersFromBuffer

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

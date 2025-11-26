import { NextRequest, NextResponse } from 'next/server'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { DocxPlaceholder, CERTIFICATE_DOCX_FIELDS, FieldMapping } from '@/types/certificate-docx'

/**
 * Extrai placeholders de um template DOCX
 */
function extractPlaceholders(content: Buffer): {
  placeholders: DocxPlaceholder[]
  warnings: string[]
} {
  const warnings: string[] = []
  const placeholdersMap = new Map<string, DocxPlaceholder>()

  try {
    const zip = new PizZip(content)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    })

    // Obter todos os tags/placeholders do documento
    const tags = doc.getFullText().match(/\{\{[^}]+\}\}/g) || []

    tags.forEach((tag) => {
      // Remove {{ }}
      const cleanTag = tag.replace(/^\{\{|\}\}$/g, '').trim()

      // Ignora condicionais (#if, /if, etc)
      if (cleanTag.startsWith('#') || cleanTag.startsWith('/')) {
        return
      }

      // Parse formato (ex: uppercase student.full_name)
      let format: string | undefined
      let fieldName = cleanTag

      const formatMatch = cleanTag.match(/^(uppercase|lowercase|capitalize|date-short|date-long)\s+(.+)$/)
      if (formatMatch) {
        format = formatMatch[1]
        fieldName = formatMatch[2]
      }

      // Verificar se o campo é conhecido
      const knownField = CERTIFICATE_DOCX_FIELDS[fieldName as keyof typeof CERTIFICATE_DOCX_FIELDS]

      if (!knownField) {
        warnings.push(`Campo desconhecido: ${fieldName}`)
      }

      // Adicionar ao mapa (evita duplicatas)
      if (!placeholdersMap.has(fieldName)) {
        placeholdersMap.set(fieldName, {
          name: fieldName,
          type: knownField?.type || 'string',
          required: knownField?.required || false,
          source: knownField ? fieldName : undefined,
          format,
        })
      }
    })
  } catch (error: any) {
    warnings.push(`Erro ao processar documento: ${error.message}`)
  }

  return {
    placeholders: Array.from(placeholdersMap.values()),
    warnings,
  }
}

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

    // Extrair placeholders
    const { placeholders, warnings } = extractPlaceholders(buffer)

    // Gerar sugestões de mapeamento
    const suggestions = generateMappingSuggestions(placeholders)

    // Validar campos obrigatórios
    const requiredFields = Object.entries(CERTIFICATE_DOCX_FIELDS)
      .filter(([, field]) => field.required)
      .map(([name]) => name)

    const missingRequired = requiredFields.filter(
      (field) => !placeholders.find((p) => p.name === field)
    )

    if (missingRequired.length > 0) {
      warnings.push(
        `Campos obrigatórios ausentes: ${missingRequired.join(', ')}`
      )
    }

    return NextResponse.json({
      success: true,
      placeholders,
      warnings,
      suggestions,
    })
  } catch (error: any) {
    console.error('Erro ao analisar template DOCX:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao analisar template',
      },
      { status: 500 }
    )
  }
}

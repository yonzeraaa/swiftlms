import PizZip from 'pizzip'
import { DocxPlaceholder, CERTIFICATE_DOCX_FIELDS } from '@/types/certificate-docx'

/**
 * Extrai texto cru de um conteúdo XML do Word (document.xml, header.xml, etc)
 * Concatena runs (<w:t>) dentro de parágrafos (<w:p>) para reconstruir o texto original
 * evitando problemas com placeholders quebrados em múltiplos runs.
 */
export function extractTextFromXml(xml: string): string {
  // Encontrar todos os parágrafos
  const paragraphRegex = /<w:p[\s\S]*?<\/w:p>/g
  const paragraphs = xml.match(paragraphRegex) || []

  return paragraphs.map(p => {
    // Encontrar todos os runs de texto dentro do parágrafo
    const textRunRegex = /<w:t[\s\S]*?>([\s\S]*?)<\/w:t>/g
    const matches = [...p.matchAll(textRunRegex)]
    
    // Concatenar o conteúdo dos runs
    return matches.map(m => m[1]).join('')
  }).join('\n')
}

export interface ExtractionResult {
  placeholders: DocxPlaceholder[]
  warnings: string[]
}

/**
 * Analisa o buffer de um arquivo DOCX e extrai placeholders
 */
export function extractPlaceholdersFromBuffer(content: Buffer): ExtractionResult {
  const warnings: string[] = []
  const placeholdersMap = new Map<string, DocxPlaceholder>()
  // Mapa auxiliar para rastrear contagem por localização
  const locationCounts = new Map<string, Map<'body' | 'header' | 'footer', number>>()

  try {
    const zip = new PizZip(content)

    // Arquivos para analisar (corpo, cabeçalhos, rodapés)
    const filesToAnalyze = Object.keys(zip.files).filter(path =>
      path === 'word/document.xml' ||
      path.startsWith('word/header') ||
      path.startsWith('word/footer')
    )

    filesToAnalyze.forEach(filePath => {
      const fileContent = zip.files[filePath].asText()
      const text = extractTextFromXml(fileContent)

      // Regex para encontrar placeholders {{ ... }}
      const placeholderRegex = /\{\{([^}]+)\}\}/g
      let match

      while ((match = placeholderRegex.exec(text)) !== null) {
        const rawTag = match[1]

        // Ignora condicionais (#if, /if, etc)
        if (rawTag.trim().startsWith('#') || rawTag.trim().startsWith('/')) {
          continue
        }

        // Normalizar espaços internos: "  student.name  " -> "student.name"
        const cleanTag = rawTag.replace(/\s+/g, ' ').trim()

        // Parse formato (ex: uppercase student.full_name)
        let format: string | undefined
        let fieldName = cleanTag

        // Suporta: "format field" ou "field"
        // Formatos conhecidos: uppercase, lowercase, capitalize, date-short, date-long
        const formatMatch = cleanTag.match(/^(uppercase|lowercase|capitalize|date-short|date-long)\s+(.+)$/)
        if (formatMatch) {
          format = formatMatch[1]
          fieldName = formatMatch[2]
        }

        // Determinar a origem (body, header, footer)
        let location: 'body' | 'header' | 'footer' = 'body'
        if (filePath.startsWith('word/header')) location = 'header'
        if (filePath.startsWith('word/footer')) location = 'footer'

        // Verificar se o campo é conhecido
        const knownField = CERTIFICATE_DOCX_FIELDS[fieldName as keyof typeof CERTIFICATE_DOCX_FIELDS]

        // Atualizar contagem de localizações
        if (!locationCounts.has(fieldName)) {
          locationCounts.set(fieldName, new Map())
        }
        const fieldLocations = locationCounts.get(fieldName)!
        fieldLocations.set(location, (fieldLocations.get(location) || 0) + 1)

        // Adicionar ou atualizar no mapa
        if (placeholdersMap.has(fieldName)) {
          const existing = placeholdersMap.get(fieldName)!
          existing.occurrenceCount = (existing.occurrenceCount || 0) + 1
        } else {
          placeholdersMap.set(fieldName, {
            name: fieldName,
            type: knownField?.type || 'string',
            required: knownField?.required || false,
            source: knownField ? fieldName : undefined,
            format,
            location, // Primeira localização encontrada
            occurrenceCount: 1
          })
        }
      }
    })

    // Adicionar todas as localizações aos placeholders
    placeholdersMap.forEach((placeholder, fieldName) => {
      const fieldLocations = locationCounts.get(fieldName)
      if (fieldLocations) {
        placeholder.locations = Array.from(fieldLocations.entries()).map(([loc, count]) => ({
          location: loc,
          count
        }))
      }
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    warnings.push(`Erro ao processar documento: ${errorMessage}`)
  }

  // Validar campos obrigatórios e gerar avisos
  const requiredFields = Object.entries(CERTIFICATE_DOCX_FIELDS)
    .filter(([, field]) => field.required)
    .map(([name]) => name)

  const foundFields = new Set(placeholdersMap.keys())

  // Avisar sobre campos obrigatórios faltando
  requiredFields.forEach(field => {
    if (!foundFields.has(field)) {
      warnings.push(`Campo obrigatório não encontrado: "${field}"`)
    }
  })

  // Avisar sobre campos desconhecidos
  placeholdersMap.forEach((p) => {
    if (!CERTIFICATE_DOCX_FIELDS[p.name as keyof typeof CERTIFICATE_DOCX_FIELDS]) {
      const locationsStr = p.locations?.map(l => `${l.location}(${l.count})`).join(', ') || ''
      warnings.push(`Campo desconhecido: "${p.name}" - ${p.occurrenceCount} ocorrência(s) em: ${locationsStr}`)
    }
  })

  // Validar tipo de formato (ex: date-short só faz sentido para campos date)
  placeholdersMap.forEach((p) => {
    const knownField = CERTIFICATE_DOCX_FIELDS[p.name as keyof typeof CERTIFICATE_DOCX_FIELDS]
    if (knownField && p.format) {
      const isDateFormat = p.format === 'date-short' || p.format === 'date-long'
      if (isDateFormat && knownField.type !== 'date') {
        warnings.push(`Formato "${p.format}" aplicado ao campo "${p.name}" que não é do tipo date`)
      }
    }
  })

  return {
    placeholders: Array.from(placeholdersMap.values()),
    warnings,
  }
}
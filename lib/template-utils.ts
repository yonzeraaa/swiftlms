import type { SuggestedMapping, TemplateAnalysis } from './template-analyzer'

/**
 * Extrai o mapeamento de array (tabela) do metadata salvo
 */
export function extractArrayMapping(metadata: any): SuggestedMapping | null {
  if (!metadata?.mappings) return null

  // Encontrar mapeamento de array
  for (const [key, value] of Object.entries(metadata.mappings)) {
    if (typeof value === 'object' && value !== null && (value as any).type === 'array') {
      return value as SuggestedMapping
    }
  }

  return null
}

/**
 * Extrai os mapeamentos estáticos (células individuais) do metadata
 */
export function extractStaticMappings(metadata: any): Record<string, string> {
  if (!metadata?.mappings) return {}

  const staticMappings: Record<string, string> = {}

  for (const [key, value] of Object.entries(metadata.mappings)) {
    // Células estáticas são mapeamentos diretos string -> string
    if (typeof value === 'string') {
      staticMappings[key] = value
    }
  }

  return staticMappings
}

/**
 * Constrói o metadata completo para salvar no banco
 */
export function buildMetadata(
  analysis: TemplateAnalysis | null,
  arrayMapping: SuggestedMapping | null,
  staticMappings: Record<string, string>
): any {
  const metadata: any = {
    mappings: {
      ...staticMappings,
    },
  }

  if (arrayMapping) {
    metadata.mappings[arrayMapping.source] = arrayMapping
  }

  if (analysis) {
    metadata.analysis = {
      headers: analysis.headers,
      staticCells: analysis.staticCells,
      sheetName: analysis.sheetName,
      totalColumns: analysis.totalColumns,
      dataStartRow: analysis.dataStartRow,
      availableSheets: analysis.availableSheets,
      version: analysis.version,
    }
  }

  return metadata
}

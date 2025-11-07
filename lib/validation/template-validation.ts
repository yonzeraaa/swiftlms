import { z } from 'zod'

/**
 * Schema de validação para mapeamento de campos em array (tabela)
 */
export const ArrayMappingSchema = z.object({
  type: z.literal('array'),
  source: z.string().min(1, 'Source é obrigatório'),
  startRow: z.number().int().positive('Start row deve ser um número positivo'),
  fields: z.record(z.string(), z.number().int().positive()),
})

/**
 * Schema de validação para mapeamentos estáticos (células individuais)
 */
export const StaticMappingsSchema = z.record(
  z.string().regex(/^[A-Z]+\d+$/, 'Endereço de célula inválido (ex: B3, D5)'),
  z.string().min(1, 'Nome do campo é obrigatório')
)

/**
 * Schema de validação para cabeçalhos de colunas
 */
export const HeaderSchema = z.object({
  column: z.number().int().positive(),
  value: z.string(),
})

/**
 * Schema de validação para células estáticas detectadas
 */
export const StaticCellSchema = z.object({
  address: z.string().regex(/^[A-Z]+\d+$/),
  label: z.string(),
  value: z.unknown().optional(),
  valueCell: z.string().regex(/^[A-Z]+\d+$/).optional(),
})

/**
 * Schema de validação para análise de template
 */
export const TemplateAnalysisSchema = z.object({
  headers: z.array(HeaderSchema),
  staticCells: z.array(StaticCellSchema),
  sheetName: z.string().optional(),
  dataStartRow: z.number().int().positive(),
  totalColumns: z.number().int().positive(),
  availableSheets: z.array(z.string()).optional(),
  validation: z
    .object({
      hasHeaders: z.boolean(),
      hasStaticCells: z.boolean(),
      warnings: z.array(z.string()),
    })
    .optional(),
})

/**
 * Schema de validação para mapeamentos completos
 */
export const MappingsSchema = z.record(
  z.string(),
  z.union([
    z.string(), // Mapeamento estático (cell address -> field name)
    ArrayMappingSchema, // Mapeamento de array
  ])
)

/**
 * Schema de validação para metadata completo
 */
export const TemplateMetadataSchema = z.object({
  mappings: MappingsSchema,
  analysis: TemplateAnalysisSchema.optional(),
})

/**
 * Schema de validação para template completo
 */
export const ExcelTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  description: z.string().max(1000, 'Descrição muito longa').nullable().optional(),
  category: z.enum(['users', 'grades', 'enrollments', 'access', 'student-history']),
  storage_path: z.string().min(1, 'Caminho de armazenamento é obrigatório'),
  storage_bucket: z.string().default('excel-templates'),
  metadata: TemplateMetadataSchema.nullable().optional(),
  is_active: z.boolean().default(true),
  created_by: z.string().uuid('ID do usuário inválido'),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

// Tipos inferidos dos schemas
export type ArrayMapping = z.infer<typeof ArrayMappingSchema>
export type StaticMappings = z.infer<typeof StaticMappingsSchema>
export type Header = z.infer<typeof HeaderSchema>
export type StaticCell = z.infer<typeof StaticCellSchema>
export type TemplateAnalysis = z.infer<typeof TemplateAnalysisSchema>
export type Mappings = z.infer<typeof MappingsSchema>
export type TemplateMetadata = z.infer<typeof TemplateMetadataSchema>
export type ExcelTemplate = z.infer<typeof ExcelTemplateSchema>

/**
 * Valida o metadata de um template
 * @param metadata - Objeto metadata para validar
 * @returns Objeto com success e errors
 */
export function validateTemplateMetadata(metadata: unknown): {
  success: boolean
  data?: TemplateMetadata
  errors?: z.ZodError
} {
  try {
    const validated = TemplateMetadataSchema.parse(metadata)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error }
    }
    throw error
  }
}

/**
 * Valida um template completo
 * @param template - Objeto template para validar
 * @returns Objeto com success e errors
 */
export function validateExcelTemplate(template: unknown): {
  success: boolean
  data?: ExcelTemplate
  errors?: z.ZodError
} {
  try {
    const validated = ExcelTemplateSchema.parse(template)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error }
    }
    throw error
  }
}

/**
 * Valida conflitos em mapeamentos
 * @param mappings - Objeto de mapeamentos
 * @returns Lista de conflitos encontrados
 */
export function detectMappingConflicts(mappings: Mappings): {
  conflicts: string[]
  warnings: string[]
} {
  const conflicts: string[] = []
  const warnings: string[] = []

  // Separar mapeamentos estáticos e de array
  const staticMappings: Record<string, string> = {}
  const arrayMappings: Record<string, ArrayMapping> = {}

  Object.entries(mappings).forEach(([key, value]) => {
    if (typeof value === 'string') {
      staticMappings[key] = value
    } else if (typeof value === 'object' && value.type === 'array') {
      arrayMappings[key] = value as ArrayMapping
    }
  })

  // Verificar se algum campo está mapeado tanto em estático quanto em array
  Object.entries(staticMappings).forEach(([cellAddress, fieldName]) => {
    Object.entries(arrayMappings).forEach(([source, arrayMapping]) => {
      if (Object.keys(arrayMapping.fields).includes(fieldName)) {
        conflicts.push(
          `Campo "${fieldName}" está mapeado tanto em célula estática (${cellAddress}) quanto na tabela (${source})`
        )
      }
    })
  })

  // Verificar se há colunas duplicadas nos arrays
  Object.entries(arrayMappings).forEach(([source, arrayMapping]) => {
    const columnCounts: Record<number, number> = {}
    Object.values(arrayMapping.fields).forEach(column => {
      columnCounts[column] = (columnCounts[column] || 0) + 1
    })

    Object.entries(columnCounts).forEach(([column, count]) => {
      if (count > 1) {
        warnings.push(
          `Na tabela "${source}", a coluna ${column} está mapeada para múltiplos campos`
        )
      }
    })
  })

  // Verificar se células estáticas se sobrepõem com área de array
  Object.entries(arrayMappings).forEach(([source, arrayMapping]) => {
    Object.keys(staticMappings).forEach(cellAddress => {
      const match = cellAddress.match(/^[A-Z]+(\d+)$/)
      if (match) {
        const row = parseInt(match[1])
        if (row >= arrayMapping.startRow) {
          warnings.push(
            `Célula estática ${cellAddress} pode sobrepor dados da tabela "${source}" (que inicia na linha ${arrayMapping.startRow})`
          )
        }
      }
    })
  })

  return { conflicts, warnings }
}

/**
 * Valida endereço de célula Excel
 * @param address - Endereço da célula (ex: B3, AA100)
 * @returns true se válido
 */
export function isValidCellAddress(address: string): boolean {
  const match = address.match(/^([A-Z]+)(\d+)$/)
  if (!match) return false

  const column = match[1]
  const row = parseInt(match[2])

  // Excel tem máximo de 16384 colunas (XFD) e 1048576 linhas
  if (row < 1 || row > 1048576) return false

  // Converter letras de coluna para número e verificar limite
  let columnNumber = 0
  for (let i = 0; i < column.length; i++) {
    columnNumber = columnNumber * 26 + (column.charCodeAt(i) - 64)
  }

  return columnNumber >= 1 && columnNumber <= 16384
}

/**
 * Sanitiza nome de arquivo para evitar caracteres especiais
 * @param filename - Nome do arquivo original
 * @returns Nome sanitizado
 */
export function sanitizeFileName(filename: string): string {
  return filename
    .replace(/\s+/g, '_') // Espaços para underscore
    .replace(/[^a-zA-Z0-9._-]/g, '') // Remove caracteres especiais
    .toLowerCase()
}

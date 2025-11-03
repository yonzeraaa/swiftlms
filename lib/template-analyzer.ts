import ExcelJS from 'exceljs'

export interface TemplateAnalysis {
  headers: Array<{
    column: number
    value: string
    suggestedField?: string
  }>
  dataStartRow: number
  sheetName: string
  totalColumns: number
}

export interface SuggestedMapping {
  type: 'array'
  source: string
  startRow: number
  fields: Record<string, number>
}

/**
 * Mapas de termos comuns para campos do sistema
 */
const FIELD_MAPPINGS: Record<string, string[]> = {
  full_name: ['nome', 'name', 'nome completo', 'full name', 'aluno', 'student', 'usuario', 'user'],
  email: ['email', 'e-mail', 'mail', 'correio'],
  role: ['perfil', 'role', 'tipo', 'type', 'função', 'cargo'],
  status: ['status', 'estado', 'state', 'situação', 'situacao'],
  created_at: ['criado em', 'created at', 'data criação', 'data', 'date', 'cadastro', 'registro'],
  phone: ['telefone', 'phone', 'celular', 'contato', 'tel'],
  cpf: ['cpf', 'documento', 'document'],
  enrollment_date: ['matricula', 'enrollment', 'data matricula', 'enrollment date'],
  course: ['curso', 'course'],
  grade: ['nota', 'grade', 'pontuação', 'score'],
  progress: ['progresso', 'progress', 'percentual', 'percentage'],
}

/**
 * Analisa um arquivo Excel para extrair estrutura e sugerir mapeamentos
 */
export async function analyzeTemplate(file: File): Promise<TemplateAnalysis> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer)

  const worksheet = workbook.getWorksheet(1)
  if (!worksheet) {
    throw new Error('Nenhuma planilha encontrada no template')
  }

  // Encontrar linha de cabeçalho (primeira linha não vazia)
  const firstRow = worksheet.getRow(1)

  // Extrair cabeçalhos
  const headers: TemplateAnalysis['headers'] = []
  let totalColumns = 0

  firstRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const value = String(cell.value || '').trim()
    if (value) {
      headers.push({
        column: colNumber,
        value,
        suggestedField: suggestFieldName(value),
      })
      totalColumns = Math.max(totalColumns, colNumber)
    }
  })

  if (headers.length === 0) {
    throw new Error('Nenhuma linha de cabeçalho encontrada')
  }

  return {
    headers,
    dataStartRow: 2,
    sheetName: worksheet.name,
    totalColumns,
  }
}

/**
 * Sugere nome de campo baseado no cabeçalho da coluna
 */
function suggestFieldName(header: string): string | undefined {
  const normalized = header.toLowerCase().trim()

  for (const [fieldName, keywords] of Object.entries(FIELD_MAPPINGS)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword) || keyword.includes(normalized)) {
        return fieldName
      }
    }
  }

  return undefined
}

/**
 * Cria mapeamento sugerido baseado na análise do template
 */
export function createSuggestedMapping(
  analysis: TemplateAnalysis,
  category: string
): SuggestedMapping {
  const fields: Record<string, number> = {}

  for (const header of analysis.headers) {
    if (header.suggestedField) {
      fields[header.suggestedField] = header.column
    }
  }

  return {
    type: 'array',
    source: getCategoryDataSource(category),
    startRow: analysis.dataStartRow,
    fields,
  }
}

/**
 * Retorna o nome da fonte de dados baseado na categoria
 */
function getCategoryDataSource(category: string): string {
  const sources: Record<string, string> = {
    users: 'users',
    grades: 'grades',
    enrollments: 'enrollments',
    access: 'accessLogs',
  }

  return sources[category] || category
}

/**
 * Valida se o mapeamento tem campos mínimos necessários
 */
export function validateMapping(mapping: SuggestedMapping, category: string): {
  valid: boolean
  missingFields: string[]
  warnings: string[]
} {
  const requiredFieldsByCategory: Record<string, string[]> = {
    users: ['full_name', 'email'],
    grades: ['full_name', 'course', 'grade'],
    enrollments: ['full_name', 'course', 'enrollment_date'],
    access: ['full_name', 'email'],
  }

  const requiredFields = requiredFieldsByCategory[category] || []
  const missingFields = requiredFields.filter((field) => !mapping.fields[field])
  const warnings: string[] = []

  if (Object.keys(mapping.fields).length === 0) {
    warnings.push('Nenhum campo foi mapeado automaticamente. Você precisará configurar manualmente.')
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
    warnings,
  }
}

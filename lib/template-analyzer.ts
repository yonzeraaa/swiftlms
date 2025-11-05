import ExcelJS from 'exceljs'
import { getFieldsForCategory } from './utils/template-fields'

export interface StaticCell {
  address: string
  row: number
  column: number
  label: string
  value: string
  suggestedField?: string
  type?: 'static'
}

export interface TemplateAnalysis {
  headers: Array<{
    column: number
    value: string
    suggestedField?: string
  }>
  staticCells: StaticCell[]
  dataStartRow: number
  sheetName: string
  totalColumns: number
  availableSheets: string[]
  version: number
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
  full_name: ['nome', 'name', 'nome completo', 'full name', 'usuario', 'user'],
  student_name: ['aluno', 'student', 'nome do aluno', 'student name'],
  email: ['email', 'e-mail', 'mail', 'correio'],
  role: ['perfil', 'role', 'tipo', 'type', 'função', 'cargo'],
  status: ['status', 'estado', 'state', 'situação', 'situacao'],
  created_at: ['criado em', 'created at', 'data criação', 'data', 'date', 'cadastro', 'registro'],
  phone: ['telefone', 'phone', 'celular', 'contato', 'tel'],
  cpf: ['cpf', 'documento', 'document'],
  enrollment_date: ['matricula', 'enrollment', 'data matricula', 'enrollment date'],
  course: ['curso', 'course'],
  course_name: ['nome do curso', 'course name', 'curso'],
  category: ['categoria', 'category', 'tipo de curso'],
  institution: ['instituição', 'instituicao', 'institution', 'escola'],
  coordination: ['coordenação', 'coordenacao', 'coordination', 'coordenador'],
  approval: ['aprovação', 'aprovacao', 'approval', 'aprovado'],
  last_access: ['último acesso', 'ultimo acesso', 'last access', 'acesso'],
  tests_grade: ['avaliação dos testes', 'avaliacao dos testes', 'nota testes', 'tests grade'],
  tcc_grade: ['avaliação do tcc', 'avaliacao do tcc', 'nota tcc', 'tcc grade', 'tcc'],
  general_average: ['média geral', 'media geral', 'general average', 'média', 'media'],
  code: ['código', 'codigo', 'code'],
  name: ['nome', 'name', 'módulos', 'modulos', 'disciplinas'],
  workload: ['carga horária', 'carga horaria', 'workload', 'horas'],
  completion_date: ['data da finalização', 'data finalizacao', 'completion date', 'finalização', 'conclusão'],
  score: ['pontuação', 'pontuacao', 'score', 'nota'],
  grade: ['nota', 'grade', 'pontuação', 'score'],
  progress: ['progresso', 'progress', 'percentual', 'percentage'],
}

/**
 * Analisa um arquivo Excel para extrair estrutura e sugerir mapeamentos
 */
export async function analyzeTemplate(
  file: File,
  options: { sheetName?: string } = {}
): Promise<TemplateAnalysis> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer)

  const sheetNames = workbook.worksheets.map(ws => ws.name)
  const worksheet =
    (options.sheetName && workbook.getWorksheet(options.sheetName)) ||
    workbook.getWorksheet(1)

  if (!worksheet) {
    throw new Error('Nenhuma planilha encontrada no template')
  }

  const staticCells: StaticCell[] = []
  let tableHeaderRow = 0
  const maxRowToScan = 50 // Limitar escaneamento

  // Primeira passagem: encontrar linha de cabeçalho da tabela
  // (linha com múltiplas colunas preenchidas consecutivas)
  let maxConsecutiveCells = 0
  let candidateHeaderRow = 0

  for (let rowNum = 1; rowNum <= Math.min(maxRowToScan, worksheet.rowCount); rowNum++) {
    const row = worksheet.getRow(rowNum)
    let consecutiveCells = 0
    let hasContent = false
    let hasLabelCell = false

    row.eachCell({ includeEmpty: false }, (cell) => {
      const value = String(cell.value || '').trim()
      if (value) {
        consecutiveCells++
        hasContent = true

        // Verificar se célula termina com ":" (é um label, não cabeçalho)
        if (value.endsWith(':')) {
          hasLabelCell = true
        }
      }
    })

    // Procurar linha com maior número de colunas consecutivas (5+)
    // Ignorar linhas que contêm labels (terminam com ":")
    if (consecutiveCells >= 5 && hasContent && !hasLabelCell && consecutiveCells > maxConsecutiveCells) {
      maxConsecutiveCells = consecutiveCells
      candidateHeaderRow = rowNum
    }
  }

  tableHeaderRow = candidateHeaderRow

  // Segunda passagem: coletar células estáticas (antes da tabela)
  for (let rowNum = 1; rowNum < tableHeaderRow; rowNum++) {
    const row = worksheet.getRow(rowNum)

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const value = String(cell.value || '').trim()

      // Detectar se célula atual é um label (termina com ':')
      const isLabel = value.endsWith(':')

      if (isLabel) {
        // Label encontrado, mapear célula adjacente (mesmo se vazia)
        const nextCell = row.getCell(colNumber + 1)
        const nextValue = String(nextCell.value || '').trim()

        staticCells.push({
          address: nextCell.address,
          row: rowNum,
          column: colNumber + 1,
          label: value.replace(':', '').trim(),
          value: nextValue,
          suggestedField: suggestFieldName(value.replace(':', '').trim()),
          type: 'static',
        })
      }
    })
  }

  // Extrair cabeçalhos da tabela
  const headers: TemplateAnalysis['headers'] = []
  let totalColumns = 0

  if (tableHeaderRow > 0) {
    const headerRow = worksheet.getRow(tableHeaderRow)

    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
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
  }

  return {
    headers,
    staticCells,
    dataStartRow: tableHeaderRow > 0 ? tableHeaderRow + 1 : 2,
    sheetName: worksheet.name,
    totalColumns,
    availableSheets: sheetNames,
    version: 2,
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
    'student-history': 'modules',
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
  const requiredFields = getFieldsForCategory(category)
    .filter(field => field.required && (field.type !== 'static'))
    .map(field => field.key)
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

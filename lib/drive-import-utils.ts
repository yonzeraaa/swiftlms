/**
 * Utilitários para importação do Google Drive
 * Detecção automática de tipo baseada em padrões de nome
 */

export type ItemType = 'module' | 'subject' | 'lesson' | 'test' | 'unknown'

export interface DriveItem {
  id: string
  name: string
  mimeType: string
  type: ItemType
  code: string | null
  prefix: string | null
}

/**
 * Detecta o tipo do item baseado no nome
 *
 * Prioridade:
 * 1. Teste (contém "teste" ou "test")
 * 2. Aula (1-4 letras + 6 dígitos)
 * 3. Disciplina (1-4 letras + 4 dígitos)
 * 4. Módulo (1-4 letras + 2 dígitos OU "Módulo/Modulo/Module X")
 */
export function detectItemType(name: string): ItemType {
  const lower = name.toLowerCase()

  // Prioridade 1: Teste
  if (lower.includes('teste') || lower.includes('test')) return 'test'

  // Prioridade 2: Aula (6 dígitos)
  if (/^[A-Za-z]{1,4}\d{6}/.test(name)) return 'lesson'

  // Prioridade 3: Disciplina (4 dígitos)
  if (/^[A-Za-z]{1,4}\d{4}/.test(name)) return 'subject'

  // Prioridade 4: Módulo (2 dígitos)
  if (/^[A-Za-z]{1,4}\d{2}/.test(name)) return 'module'

  // Prioridade 5: Módulo com nome descritivo (Módulo 1, Module A, MOD 01, etc.)
  if (/^(m[oó]dulo|module|mod)\s*[\d\w]/i.test(name)) return 'module'

  // Prioridade 6: Disciplina com nome descritivo (Disciplina 1, Subject A, etc.)
  if (/^(disciplina|subject|disc)\s*[\d\w]/i.test(name)) return 'subject'

  // Prioridade 7: Aula com nome descritivo (Aula 1, Lesson A, etc.)
  if (/^(aula|lesson|class)\s*[\d\w]/i.test(name)) return 'lesson'

  return 'unknown'
}

/**
 * Extrai o código do nome (prefixo + números)
 * Ex: "MAT020101_Introducao.pdf" → "MAT020101"
 * Ex: "Módulo 1" → "MOD01"
 * Ex: "Disciplina 02" → "DISC02"
 * Ex: "Aula 3" → "AULA03"
 */
export function extractCode(name: string): string | null {
  // Padrão tradicional: letras + dígitos no início
  const traditionalMatch = name.match(/^([A-Za-z]{1,4}\d{2,6})/)
  if (traditionalMatch) return traditionalMatch[1]

  // Padrão descritivo para módulos: "Módulo 1", "Module A", "MOD 01"
  const moduleMatch = name.match(/^(m[oó]dulo|module|mod)\s*(\d+|[a-z])/i)
  if (moduleMatch) {
    const num = moduleMatch[2]
    const paddedNum = /^\d+$/.test(num) ? num.padStart(2, '0') : num.toUpperCase()
    return `MOD${paddedNum}`
  }

  // Padrão descritivo para disciplinas: "Disciplina 1", "Subject A", "DISC 01"
  const subjectMatch = name.match(/^(disciplina|subject|disc)\s*(\d+|[a-z])/i)
  if (subjectMatch) {
    const num = subjectMatch[2]
    const paddedNum = /^\d+$/.test(num) ? num.padStart(4, '0') : num.toUpperCase()
    return `DISC${paddedNum}`
  }

  // Padrão descritivo para aulas: "Aula 1", "Lesson A", "Class 01"
  const lessonMatch = name.match(/^(aula|lesson|class)\s*(\d+|[a-z])/i)
  if (lessonMatch) {
    const num = lessonMatch[2]
    const paddedNum = /^\d+$/.test(num) ? num.padStart(6, '0') : num.toUpperCase()
    return `AULA${paddedNum}`
  }

  return null
}

/**
 * Extrai apenas o prefixo (letras) do código
 * Ex: "MAT020101" → "MAT"
 */
export function extractPrefix(code: string): string {
  return code.replace(/\d/g, '')
}

/**
 * Extrai o folderId de uma URL do Google Drive
 * Ex: "https://drive.google.com/drive/folders/ABC123" → "ABC123"
 */
export function extractFolderId(url: string): string | null {
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

/**
 * Determina o prefixo pai baseado no código
 * MAT020101 → MAT0201 (disciplina pai)
 * MAT0201 → MAT02 (módulo pai)
 * MAT02 → null (não tem pai)
 */
export function getParentPrefix(code: string): string | null {
  const prefix = extractPrefix(code)
  const numbers = code.replace(/[A-Za-z]/g, '')

  if (numbers.length === 6) {
    // Aula → Disciplina (remove últimos 2 dígitos)
    return prefix + numbers.slice(0, 4)
  } else if (numbers.length === 4) {
    // Disciplina → Módulo (remove últimos 2 dígitos)
    return prefix + numbers.slice(0, 2)
  }

  return null
}

/**
 * Analisa um item do Drive e retorna informações estruturadas
 */
export function analyzeDriveItem(item: { id: string; name: string; mimeType: string }): DriveItem {
  const type = detectItemType(item.name)
  const code = extractCode(item.name)
  const prefix = code ? extractPrefix(code) : null

  return {
    id: item.id,
    name: item.name,
    mimeType: item.mimeType,
    type,
    code,
    prefix
  }
}

export interface ValidationError {
  field: 'code' | 'type' | 'hierarchy'
  message: string
}

/**
 * Valida se o código tem o tamanho correto para o tipo
 * module = 2 dígitos, subject = 4 dígitos, lesson/test = 6 dígitos
 */
export function validateCodeForType(code: string | null, type: ItemType): ValidationError | null {
  // Testes sempre precisam de código
  if (type === 'test' && !code) {
    return { field: 'code', message: 'Testes precisam de código' }
  }

  if (!code) return null
  if (type === 'unknown') return null

  const numbers = code.replace(/[A-Za-z]/g, '')

  const expectedLength: Record<string, number> = {
    module: 2,
    subject: 4,
    lesson: 6,
    test: 6
  }

  const expected = expectedLength[type]
  if (expected && numbers.length !== expected) {
    return {
      field: 'code',
      message: `Código de ${type} deve ter ${expected} dígitos (tem ${numbers.length})`
    }
  }

  return null
}

/**
 * Valida se o código do filho começa com o código do pai
 */
export function validateParentChildCode(parentCode: string | null, childCode: string | null): ValidationError | null {
  if (!parentCode || !childCode) return null

  const parentPrefix = extractPrefix(parentCode)
  const childPrefix = extractPrefix(childCode)

  // Prefixos devem ser iguais
  if (parentPrefix.toUpperCase() !== childPrefix.toUpperCase()) {
    return {
      field: 'hierarchy',
      message: `Prefixo incompatível: pai "${parentPrefix}", filho "${childPrefix}"`
    }
  }

  const parentNumbers = parentCode.replace(/[A-Za-z]/g, '')
  const childNumbers = childCode.replace(/[A-Za-z]/g, '')

  // Código do filho deve começar com os dígitos do pai
  if (!childNumbers.startsWith(parentNumbers)) {
    return {
      field: 'hierarchy',
      message: `Código "${childCode}" não pertence ao pai "${parentCode}"`
    }
  }

  return null
}

/**
 * Valida um item completo e retorna todos os erros encontrados
 */
export function validateDriveItem(
  item: { code: string | null; type: ItemType },
  parentCode?: string | null
): ValidationError[] {
  const errors: ValidationError[] = []

  const codeError = validateCodeForType(item.code, item.type)
  if (codeError) errors.push(codeError)

  if (parentCode) {
    const hierarchyError = validateParentChildCode(parentCode, item.code)
    if (hierarchyError) errors.push(hierarchyError)
  }

  return errors
}

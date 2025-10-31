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
 * 1. Teste (contém "teste")
 * 2. Aula (1-4 letras + 6 dígitos)
 * 3. Disciplina (1-4 letras + 4 dígitos)
 * 4. Módulo (1-4 letras + 2 dígitos)
 */
export function detectItemType(name: string): ItemType {
  const lower = name.toLowerCase()

  // Prioridade 1: Teste
  if (lower.includes('teste')) return 'test'

  // Prioridade 2: Aula (6 dígitos)
  if (/^[A-Za-z]{1,4}\d{6}/.test(name)) return 'lesson'

  // Prioridade 3: Disciplina (4 dígitos)
  if (/^[A-Za-z]{1,4}\d{4}/.test(name)) return 'subject'

  // Prioridade 4: Módulo (2 dígitos)
  if (/^[A-Za-z]{1,4}\d{2}/.test(name)) return 'module'

  return 'unknown'
}

/**
 * Extrai o código do nome (prefixo + números)
 * Ex: "MAT020101_Introducao.pdf" → "MAT020101"
 */
export function extractCode(name: string): string | null {
  const match = name.match(/^([A-Za-z]{1,4}\d{2,6})/)
  return match ? match[1] : null
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

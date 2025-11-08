export interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
  size?: number
}

export interface DocumentContent {
  title: string
  content: string
  wordCount: number
  metadata?: Record<string, any>
}

export interface ImportValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export class GoogleDriveService {
  /**
   * Valida URL do Google Drive
   */
  isValidDriveUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false
    }

    const drivePatterns = [
      /^https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
      /^https:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
      /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
    ]

    return drivePatterns.some(pattern => pattern.test(url))
  }

  /**
   * Extrai file ID de URL do Google Drive
   */
  extractFileId(url: string): string | null {
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /\/document\/d\/([a-zA-Z0-9_-]+)/,
      /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
      /[\?&]id=([a-zA-Z0-9_-]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    return null
  }

  /**
   * Valida tipo MIME do arquivo
   */
  isValidMimeType(mimeType: string): boolean {
    const validTypes = [
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.spreadsheet',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    return validTypes.includes(mimeType)
  }

  /**
   * Valida tamanho do arquivo (max 50MB)
   */
  isValidFileSize(sizeInBytes: number, maxSizeMB: number = 50): boolean {
    const maxBytes = maxSizeMB * 1024 * 1024
    return sizeInBytes <= maxBytes
  }

  /**
   * Valida conteúdo do documento
   */
  validateDocumentContent(content: DocumentContent): ImportValidation {
    const errors: string[] = []
    const warnings: string[] = []

    if (!content.title || content.title.trim() === '') {
      errors.push('Título do documento é obrigatório')
    }

    if (content.title && content.title.length > 200) {
      errors.push('Título do documento excede 200 caracteres')
    }

    if (!content.content || content.content.trim() === '') {
      errors.push('Conteúdo do documento está vazio')
    }

    if (content.wordCount < 10) {
      warnings.push('Documento possui menos de 10 palavras')
    }

    if (content.wordCount > 50000) {
      warnings.push('Documento muito longo (>50000 palavras)')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Limpa e normaliza conteúdo de documento
   */
  sanitizeContent(content: string): string {
    // Remove múltiplas quebras de linha
    let sanitized = content.replace(/\n{3,}/g, '\n\n')

    // Remove espaços no início e fim
    sanitized = sanitized.trim()

    // Remove espaços múltiplos
    sanitized = sanitized.replace(/ {2,}/g, ' ')

    return sanitized
  }

  /**
   * Conta palavras em um texto
   */
  countWords(text: string): number {
    if (!text || text.trim() === '') {
      return 0
    }

    const words = text.trim().split(/\s+/)
    return words.filter(word => word.length > 0).length
  }

  /**
   * Extrai título de conteúdo (primeira linha não vazia)
   */
  extractTitle(content: string, maxLength: number = 100): string {
    const lines = content.split('\n').map(line => line.trim())
    const firstLine = lines.find(line => line.length > 0) || 'Sem título'

    return firstLine.substring(0, maxLength)
  }

  /**
   * Valida importação de curso
   */
  validateCourseImport(data: {
    title: string
    description?: string
    modules?: number
  }): ImportValidation {
    const errors: string[] = []
    const warnings: string[] = []

    if (!data.title || data.title.trim() === '') {
      errors.push('Título do curso é obrigatório')
    }

    if (data.title && data.title.length < 5) {
      errors.push('Título do curso deve ter pelo menos 5 caracteres')
    }

    if (data.description && data.description.length > 5000) {
      errors.push('Descrição do curso excede 5000 caracteres')
    }

    if (data.modules !== undefined && data.modules < 1) {
      errors.push('Curso deve ter pelo menos 1 módulo')
    }

    if (data.modules !== undefined && data.modules > 50) {
      warnings.push('Curso possui muitos módulos (>50)')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Gera nome de arquivo seguro
   */
  sanitizeFileName(fileName: string): string {
    // Separa nome e extensão
    const lastDotIndex = fileName.lastIndexOf('.')
    const hasExtension = lastDotIndex > 0 && lastDotIndex < fileName.length - 1

    const name = hasExtension ? fileName.substring(0, lastDotIndex) : fileName
    const ext = hasExtension ? fileName.substring(lastDotIndex) : ''

    // Remove caracteres especiais do nome
    let sanitized = name.replace(/[^a-zA-Z0-9._-]/g, '_')

    // Remove underscores múltiplos
    sanitized = sanitized.replace(/_+/g, '_')

    // Remove underscores no início/fim
    sanitized = sanitized.replace(/^_+|_+$/g, '')

    // Limita tamanho
    if (sanitized.length > 100 - ext.length) {
      sanitized = sanitized.substring(0, 100 - ext.length)
    }

    const result = (sanitized || 'arquivo') + ext
    return result
  }

  /**
   * Formata tamanho de arquivo para exibição
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Verifica se arquivo é documento de texto
   */
  isTextDocument(mimeType: string): boolean {
    const textTypes = [
      'application/vnd.google-apps.document',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    return textTypes.includes(mimeType)
  }

  /**
   * Verifica se arquivo é planilha
   */
  isSpreadsheet(mimeType: string): boolean {
    const spreadsheetTypes = [
      'application/vnd.google-apps.spreadsheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]

    return spreadsheetTypes.includes(mimeType)
  }
}

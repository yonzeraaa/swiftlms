import { describe, it, expect, beforeEach } from 'vitest'
import {
  GoogleDriveService,
  type DocumentContent,
} from '@/lib/services/GoogleDriveService'

describe('GoogleDriveService', () => {
  let service: GoogleDriveService

  beforeEach(() => {
    service = new GoogleDriveService()
  })

  describe('isValidDriveUrl', () => {
    it('should validate Google Drive file URLs', () => {
      expect(service.isValidDriveUrl('https://drive.google.com/file/d/abc123/view')).toBe(true)
      expect(service.isValidDriveUrl('https://docs.google.com/document/d/xyz789/edit')).toBe(true)
      expect(service.isValidDriveUrl('https://docs.google.com/spreadsheets/d/def456/edit')).toBe(true)
    })

    it('should return false for invalid URLs', () => {
      expect(service.isValidDriveUrl('https://example.com/file')).toBe(false)
      expect(service.isValidDriveUrl('not-a-url')).toBe(false)
      expect(service.isValidDriveUrl('')).toBe(false)
    })

    it('should handle null/undefined', () => {
      expect(service.isValidDriveUrl(null as any)).toBe(false)
      expect(service.isValidDriveUrl(undefined as any)).toBe(false)
    })
  })

  describe('extractFileId', () => {
    it('should extract file ID from drive.google.com URLs', () => {
      expect(service.extractFileId('https://drive.google.com/file/d/abc123xyz/view')).toBe('abc123xyz')
    })

    it('should extract file ID from docs.google.com URLs', () => {
      expect(service.extractFileId('https://docs.google.com/document/d/xyz789def/edit')).toBe('xyz789def')
    })

    it('should extract file ID from spreadsheets URLs', () => {
      expect(service.extractFileId('https://docs.google.com/spreadsheets/d/def456ghi/edit')).toBe('def456ghi')
    })

    it('should extract file ID from query parameter', () => {
      expect(service.extractFileId('https://drive.google.com/open?id=abc123')).toBe('abc123')
    })

    it('should return null for invalid URLs', () => {
      expect(service.extractFileId('https://example.com/file')).toBeNull()
      expect(service.extractFileId('invalid-url')).toBeNull()
    })
  })

  describe('isValidMimeType', () => {
    it('should validate Google Docs mimeType', () => {
      expect(service.isValidMimeType('application/vnd.google-apps.document')).toBe(true)
      expect(service.isValidMimeType('application/vnd.google-apps.spreadsheet')).toBe(true)
    })

    it('should validate standard document types', () => {
      expect(service.isValidMimeType('application/pdf')).toBe(true)
      expect(service.isValidMimeType('text/plain')).toBe(true)
      expect(service.isValidMimeType('application/msword')).toBe(true)
    })

    it('should return false for invalid mimeTypes', () => {
      expect(service.isValidMimeType('image/png')).toBe(false)
      expect(service.isValidMimeType('video/mp4')).toBe(false)
      expect(service.isValidMimeType('application/zip')).toBe(false)
    })
  })

  describe('isValidFileSize', () => {
    it('should validate file size under 50MB', () => {
      expect(service.isValidFileSize(1024 * 1024)).toBe(true) // 1MB
      expect(service.isValidFileSize(10 * 1024 * 1024)).toBe(true) // 10MB
      expect(service.isValidFileSize(49 * 1024 * 1024)).toBe(true) // 49MB
    })

    it('should reject files over 50MB', () => {
      expect(service.isValidFileSize(51 * 1024 * 1024)).toBe(false) // 51MB
      expect(service.isValidFileSize(100 * 1024 * 1024)).toBe(false) // 100MB
    })

    it('should support custom max size', () => {
      expect(service.isValidFileSize(60 * 1024 * 1024, 100)).toBe(true) // 60MB with 100MB limit
      expect(service.isValidFileSize(5 * 1024 * 1024, 2)).toBe(false) // 5MB with 2MB limit
    })
  })

  describe('validateDocumentContent', () => {
    it('should validate correct document content', () => {
      const content: DocumentContent = {
        title: 'Curso de Programação',
        content: 'Este é um conteúdo válido com texto suficiente para ser considerado válido.',
        wordCount: 12,
      }

      const result = service.validateDocumentContent(content)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return error if title is empty', () => {
      const content: DocumentContent = {
        title: '',
        content: 'Conteúdo válido',
        wordCount: 2,
      }

      const result = service.validateDocumentContent(content)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Título do documento é obrigatório')
    })

    it('should return error if title is too long', () => {
      const content: DocumentContent = {
        title: 'A'.repeat(250),
        content: 'Conteúdo',
        wordCount: 1,
      }

      const result = service.validateDocumentContent(content)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('200 caracteres'))).toBe(true)
    })

    it('should return error if content is empty', () => {
      const content: DocumentContent = {
        title: 'Título',
        content: '',
        wordCount: 0,
      }

      const result = service.validateDocumentContent(content)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Conteúdo do documento está vazio')
    })

    it('should warn if document has few words', () => {
      const content: DocumentContent = {
        title: 'Título',
        content: 'Pouco texto',
        wordCount: 2,
      }

      const result = service.validateDocumentContent(content)

      expect(result.warnings.some(w => w.includes('menos de 10 palavras'))).toBe(true)
    })

    it('should warn if document is too long', () => {
      const content: DocumentContent = {
        title: 'Título',
        content: 'Texto',
        wordCount: 60000,
      }

      const result = service.validateDocumentContent(content)

      expect(result.warnings.some(w => w.includes('muito longo'))).toBe(true)
    })
  })

  describe('sanitizeContent', () => {
    it('should remove multiple line breaks', () => {
      const content = 'Line 1\n\n\n\nLine 2'
      expect(service.sanitizeContent(content)).toBe('Line 1\n\nLine 2')
    })

    it('should trim whitespace', () => {
      const content = '   Text with spaces   '
      expect(service.sanitizeContent(content)).toBe('Text with spaces')
    })

    it('should remove multiple spaces', () => {
      const content = 'Text    with    spaces'
      expect(service.sanitizeContent(content)).toBe('Text with spaces')
    })
  })

  describe('countWords', () => {
    it('should count words correctly', () => {
      expect(service.countWords('Hello world')).toBe(2)
      expect(service.countWords('Este é um teste de contagem de palavras')).toBe(8)
    })

    it('should handle empty string', () => {
      expect(service.countWords('')).toBe(0)
      expect(service.countWords('   ')).toBe(0)
    })

    it('should handle multiple spaces', () => {
      expect(service.countWords('Word1    Word2    Word3')).toBe(3)
    })
  })

  describe('extractTitle', () => {
    it('should extract first non-empty line as title', () => {
      const content = '\n\nCurso de Python\nDescrição do curso'
      expect(service.extractTitle(content)).toBe('Curso de Python')
    })

    it('should limit title length', () => {
      const content = 'A'.repeat(200)
      const result = service.extractTitle(content, 50)
      expect(result).toHaveLength(50)
    })

    it('should return default if no content', () => {
      expect(service.extractTitle('')).toBe('Sem título')
      expect(service.extractTitle('\n\n')).toBe('Sem título')
    })
  })

  describe('validateCourseImport', () => {
    it('should validate correct course data', () => {
      const data = {
        title: 'Curso de JavaScript',
        description: 'Aprenda JavaScript do zero',
        modules: 10,
      }

      const result = service.validateCourseImport(data)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return error if title is empty', () => {
      const data = { title: '', modules: 5 }

      const result = service.validateCourseImport(data)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Título do curso é obrigatório')
    })

    it('should return error if title is too short', () => {
      const data = { title: 'ABC', modules: 5 }

      const result = service.validateCourseImport(data)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('5 caracteres'))).toBe(true)
    })

    it('should return error if description is too long', () => {
      const data = {
        title: 'Curso Teste',
        description: 'A'.repeat(6000),
        modules: 5,
      }

      const result = service.validateCourseImport(data)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('5000 caracteres'))).toBe(true)
    })

    it('should return error if modules < 1', () => {
      const data = { title: 'Curso Teste', modules: 0 }

      const result = service.validateCourseImport(data)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('pelo menos 1 módulo'))).toBe(true)
    })

    it('should warn if too many modules', () => {
      const data = { title: 'Curso Teste', modules: 60 }

      const result = service.validateCourseImport(data)

      expect(result.warnings.some(w => w.includes('muitos módulos'))).toBe(true)
    })
  })

  describe('sanitizeFileName', () => {
    it('should replace special characters with underscore', () => {
      expect(service.sanitizeFileName('file@name#2024.pdf')).toBe('file_name_2024.pdf')
    })

    it('should remove multiple underscores', () => {
      expect(service.sanitizeFileName('file___name.pdf')).toBe('file_name.pdf')
    })

    it('should trim underscores', () => {
      expect(service.sanitizeFileName('_file_name_.pdf')).toBe('file_name.pdf')
    })

    it('should limit length to 100 characters', () => {
      const longName = 'A'.repeat(150) + '.pdf'
      const result = service.sanitizeFileName(longName)
      expect(result.length).toBeLessThanOrEqual(100)
      expect(result).toContain('.pdf')
    })

    it('should return default if result is empty', () => {
      expect(service.sanitizeFileName('###')).toBe('arquivo')
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(service.formatFileSize(0)).toBe('0 Bytes')
      expect(service.formatFileSize(500)).toBe('500 Bytes')
    })

    it('should format kilobytes', () => {
      expect(service.formatFileSize(1024)).toBe('1 KB')
      expect(service.formatFileSize(2048)).toBe('2 KB')
    })

    it('should format megabytes', () => {
      expect(service.formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(service.formatFileSize(5 * 1024 * 1024)).toBe('5 MB')
    })

    it('should format gigabytes', () => {
      expect(service.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    })
  })

  describe('isTextDocument', () => {
    it('should identify text documents', () => {
      expect(service.isTextDocument('application/vnd.google-apps.document')).toBe(true)
      expect(service.isTextDocument('text/plain')).toBe(true)
      expect(service.isTextDocument('application/msword')).toBe(true)
    })

    it('should return false for non-text types', () => {
      expect(service.isTextDocument('application/vnd.google-apps.spreadsheet')).toBe(false)
      expect(service.isTextDocument('image/png')).toBe(false)
    })
  })

  describe('isSpreadsheet', () => {
    it('should identify spreadsheets', () => {
      expect(service.isSpreadsheet('application/vnd.google-apps.spreadsheet')).toBe(true)
      expect(service.isSpreadsheet('application/vnd.ms-excel')).toBe(true)
    })

    it('should return false for non-spreadsheet types', () => {
      expect(service.isSpreadsheet('application/vnd.google-apps.document')).toBe(false)
      expect(service.isSpreadsheet('application/pdf')).toBe(false)
    })
  })
})

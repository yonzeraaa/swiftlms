import { describe, it, expect } from 'vitest'
import {
  detectItemType,
  extractCode,
  extractPrefix,
  extractFolderId,
  getParentPrefix,
  analyzeDriveItem,
  extractDisplayName,
  type ItemType,
  type DriveItem,
} from '@/lib/drive-import-utils'

describe('drive-import-utils', () => {
  describe('detectItemType', () => {
    it('should detect test type for items with "teste" or "test" as whole words', () => {
      expect(detectItemType('Teste de Matemática')).toBe('test')
      expect(detectItemType('MAT0201 - Teste Final')).toBe('test')
      expect(detectItemType('teste basico')).toBe('test')
      expect(detectItemType('DCMD010101-AVALIAÇÃO TESTE')).toBe('test')
      expect(detectItemType('Test Final')).toBe('test')
    })

    it('should NOT classify as test when "test" is only a substring', () => {
      // "atestado", "contestação", "protesto" contêm "test" mas não são testes
      expect(detectItemType('MAT0201-ATESTADO DE CONCLUSÃO')).toBe('subject')
      expect(detectItemType('MAT020101-CONTESTAÇÃO DA PROVA')).toBe('lesson')
      expect(detectItemType('MAT020101-SISTEMA DE PROTEÇÃO ANTIINCRUSTANTE')).toBe('lesson')
    })

    it('should detect lesson type for 6-digit codes', () => {
      expect(detectItemType('MAT020101_Introducao')).toBe('lesson')
      expect(detectItemType('FIS010203 Aula 3')).toBe('lesson')
      expect(detectItemType('Q020304_Conteudo')).toBe('lesson')
    })

    it('should detect subject type for 4-digit codes', () => {
      expect(detectItemType('MAT0201_Calculo')).toBe('subject')
      expect(detectItemType('FIS0102 Fisica')).toBe('subject')
      expect(detectItemType('Q0203_Quimica')).toBe('subject')
    })

    it('should detect module type for 2-digit codes', () => {
      expect(detectItemType('MAT02_Modulo')).toBe('module')
      expect(detectItemType('FIS01 Modulo')).toBe('module')
      expect(detectItemType('Q03_Base')).toBe('module')
    })

    it('should return unknown for unrecognized patterns', () => {
      expect(detectItemType('Arquivo Qualquer')).toBe('unknown')
      expect(detectItemType('Document.pdf')).toBe('unknown')
      expect(detectItemType('123456')).toBe('unknown')
    })

    it('should prioritize test over code patterns', () => {
      expect(detectItemType('MAT020101 Teste')).toBe('test')
    })

    it('should prioritize lesson over subject and module', () => {
      expect(detectItemType('MAT020101')).toBe('lesson')
    })

    it('should prioritize subject over module', () => {
      expect(detectItemType('MAT0201')).toBe('subject')
    })

    it('should handle codes with 1-4 letter prefixes', () => {
      expect(detectItemType('M020101')).toBe('lesson')
      expect(detectItemType('MAT020101')).toBe('lesson')
      expect(detectItemType('MATH020101')).toBe('lesson')
    })
  })

  describe('extractCode', () => {
    it('should extract code from names', () => {
      expect(extractCode('MAT020101_Introducao')).toBe('MAT020101')
      expect(extractCode('FIS0201 Fisica')).toBe('FIS0201')
      expect(extractCode('Q02_Modulo')).toBe('Q02')
    })

    it('should handle codes with underscores', () => {
      expect(extractCode('MAT020101_Aula.pdf')).toBe('MAT020101')
    })

    it('should handle codes with spaces', () => {
      expect(extractCode('MAT020101 Conteudo')).toBe('MAT020101')
    })

    it('should return null for names without code', () => {
      expect(extractCode('Arquivo Qualquer')).toBeNull()
      expect(extractCode('Document.pdf')).toBeNull()
      expect(extractCode('123456')).toBeNull()
    })

    it('should extract 2-digit codes', () => {
      expect(extractCode('MAT02_Modulo')).toBe('MAT02')
    })

    it('should extract 4-digit codes', () => {
      expect(extractCode('MAT0201_Disciplina')).toBe('MAT0201')
    })

    it('should extract 6-digit codes', () => {
      expect(extractCode('MAT020101_Aula')).toBe('MAT020101')
    })

    it('should handle 1-letter prefixes', () => {
      expect(extractCode('M020101')).toBe('M020101')
    })

    it('should handle 4-letter prefixes', () => {
      expect(extractCode('MATH020101')).toBe('MATH020101')
    })
  })

  describe('extractPrefix', () => {
    it('should extract prefix from codes', () => {
      expect(extractPrefix('MAT020101')).toBe('MAT')
      expect(extractPrefix('FIS0201')).toBe('FIS')
      expect(extractPrefix('Q02')).toBe('Q')
    })

    it('should handle codes with multiple letters', () => {
      expect(extractPrefix('MATH020101')).toBe('MATH')
    })

    it('should return empty string for numeric-only codes', () => {
      expect(extractPrefix('020101')).toBe('')
    })

    it('should return full string for letter-only input', () => {
      expect(extractPrefix('MAT')).toBe('MAT')
    })
  })

  describe('extractFolderId', () => {
    it('should extract folder ID from Google Drive URLs', () => {
      expect(extractFolderId('https://drive.google.com/drive/folders/ABC123xyz')).toBe('ABC123xyz')
      expect(extractFolderId('https://drive.google.com/drive/folders/1a2B3c4D5e')).toBe('1a2B3c4D5e')
    })

    it('should handle URLs with additional parameters', () => {
      expect(extractFolderId('https://drive.google.com/drive/folders/ABC123?usp=sharing')).toBe('ABC123')
    })

    it('should return null for invalid URLs', () => {
      expect(extractFolderId('https://example.com/folder/ABC123')).toBeNull()
      expect(extractFolderId('https://drive.google.com/file/d/ABC123')).toBeNull()
      expect(extractFolderId('invalid-url')).toBeNull()
    })

    it('should handle folder IDs with hyphens and underscores', () => {
      expect(extractFolderId('https://drive.google.com/drive/folders/ABC-123_xyz')).toBe('ABC-123_xyz')
    })
  })

  describe('getParentPrefix', () => {
    it('should return parent prefix for 6-digit codes (lesson → subject)', () => {
      expect(getParentPrefix('MAT020101')).toBe('MAT0201')
      expect(getParentPrefix('FIS010203')).toBe('FIS0102')
    })

    it('should return parent prefix for 4-digit codes (subject → module)', () => {
      expect(getParentPrefix('MAT0201')).toBe('MAT02')
      expect(getParentPrefix('FIS0102')).toBe('FIS01')
    })

    it('should return null for 2-digit codes (module has no parent)', () => {
      expect(getParentPrefix('MAT02')).toBeNull()
      expect(getParentPrefix('FIS01')).toBeNull()
    })

    it('should return null for codes with other digit counts', () => {
      expect(getParentPrefix('MAT0')).toBeNull()
      expect(getParentPrefix('MAT020')).toBeNull()
      expect(getParentPrefix('MAT02010')).toBeNull()
    })

    it('should preserve prefix letters', () => {
      expect(getParentPrefix('MATH020101')).toBe('MATH0201')
      expect(getParentPrefix('MATH0201')).toBe('MATH02')
    })

    it('should handle single-letter prefixes', () => {
      expect(getParentPrefix('M020101')).toBe('M0201')
      expect(getParentPrefix('M0201')).toBe('M02')
    })
  })

  describe('extractDisplayName', () => {
    it('should strip code with hyphen separator', () => {
      expect(extractDisplayName('DCMD0101-CENÁRIO DE OPORTUNIDADES', 'DCMD0101')).toBe('CENÁRIO DE OPORTUNIDADES')
      expect(extractDisplayName('MAT020101-Introdução à Álgebra', 'MAT020101')).toBe('Introdução à Álgebra')
    })

    it('should strip code with underscore separator', () => {
      expect(extractDisplayName('MAT0201_Cálculo Diferencial', 'MAT0201')).toBe('Cálculo Diferencial')
    })

    it('should strip code with space separator', () => {
      expect(extractDisplayName('MCMD01 Princípios Básicos', 'MCMD01')).toBe('Princípios Básicos')
    })

    it('should return original name if code is null', () => {
      expect(extractDisplayName('DCMD0101-CENÁRIO DE OPORTUNIDADES', null)).toBe('DCMD0101-CENÁRIO DE OPORTUNIDADES')
    })

    it('should return original name if code is not at start', () => {
      expect(extractDisplayName('Introdução DCMD0101', 'DCMD0101')).toBe('Introdução DCMD0101')
    })

    it('should return original name when stripping would leave empty string', () => {
      expect(extractDisplayName('DCMD0101', 'DCMD0101')).toBe('DCMD0101')
    })

    it('should handle names without separator after code', () => {
      // Sem separador → não remove (exige pelo menos um separador)
      expect(extractDisplayName('DCMD0101TÍTULO', 'DCMD0101')).toBe('DCMD0101TÍTULO')
    })
  })

  describe('analyzeDriveItem', () => {
    it('should analyze a lesson item correctly', () => {
      const item = {
        id: 'abc-123',
        name: 'MAT020101_Introducao',
        mimeType: 'application/pdf'
      }

      const result = analyzeDriveItem(item)

      expect(result.id).toBe('abc-123')
      expect(result.name).toBe('MAT020101_Introducao')
      expect(result.mimeType).toBe('application/pdf')
      expect(result.type).toBe('lesson')
      expect(result.code).toBe('MAT020101')
      expect(result.prefix).toBe('MAT')
    })

    it('should analyze a subject item correctly', () => {
      const item = {
        id: 'def-456',
        name: 'FIS0201_Fisica',
        mimeType: 'application/vnd.google-apps.folder'
      }

      const result = analyzeDriveItem(item)

      expect(result.type).toBe('subject')
      expect(result.code).toBe('FIS0201')
      expect(result.prefix).toBe('FIS')
    })

    it('should analyze a module item correctly', () => {
      const item = {
        id: 'ghi-789',
        name: 'MAT02_Modulo',
        mimeType: 'application/vnd.google-apps.folder'
      }

      const result = analyzeDriveItem(item)

      expect(result.type).toBe('module')
      expect(result.code).toBe('MAT02')
      expect(result.prefix).toBe('MAT')
    })

    it('should analyze a test item correctly', () => {
      const item = {
        id: 'jkl-101',
        name: 'MAT020101 Teste Final',
        mimeType: 'application/pdf'
      }

      const result = analyzeDriveItem(item)

      expect(result.type).toBe('test')
      expect(result.code).toBe('MAT020101')
      expect(result.prefix).toBe('MAT')
    })

    it('should handle unknown items', () => {
      const item = {
        id: 'mno-202',
        name: 'Arquivo Qualquer',
        mimeType: 'application/pdf'
      }

      const result = analyzeDriveItem(item)

      expect(result.type).toBe('unknown')
      expect(result.code).toBeNull()
      expect(result.prefix).toBeNull()
    })

    it('should return DriveItem interface', () => {
      const item = {
        id: 'test-id',
        name: 'MAT020101',
        mimeType: 'test-mime'
      }

      const result: DriveItem = analyzeDriveItem(item)

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('name')
      expect(result).toHaveProperty('mimeType')
      expect(result).toHaveProperty('type')
      expect(result).toHaveProperty('code')
      expect(result).toHaveProperty('prefix')
    })
  })
})

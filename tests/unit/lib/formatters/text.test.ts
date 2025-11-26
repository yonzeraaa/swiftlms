import { describe, it, expect } from 'vitest'
import { truncateText, slugify, capitalize, formatFileSize } from '@/lib/formatters/text'

describe('Text Formatters', () => {
  describe('truncateText', () => {
    it('should truncate long text and add "..."', () => {
      const result = truncateText('Este é um texto muito longo', 10)
      expect(result).toBe('Este é um...')
    })

    it('should not truncate if text is shorter than maxLength', () => {
      const result = truncateText('Curto', 10)
      expect(result).toBe('Curto')
    })

    it('should handle exact length', () => {
      const result = truncateText('Exato', 5)
      expect(result).toBe('Exato')
    })
  })

  describe('slugify', () => {
    it('should convert "Aula 1: Introdução" to "aula-1-introducao"', () => {
      const result = slugify('Aula 1: Introdução')
      expect(result).toBe('aula-1-introducao')
    })

    it('should remove special characters', () => {
      const result = slugify('Teste @#$ Especial!')
      expect(result).toBe('teste-especial')
    })

    it('should handle multiple spaces', () => {
      const result = slugify('Múltiplos    Espaços')
      expect(result).toBe('multiplos-espacos')
    })

    it('should remove accents', () => {
      const result = slugify('Açúcar é Ótimo')
      expect(result).toBe('acucar-e-otimo')
    })

    it('should handle already slugified text', () => {
      const result = slugify('already-slugified')
      expect(result).toBe('already-slugified')
    })
  })

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello')
    })

    it('should lowercase rest of the string', () => {
      expect(capitalize('hELLO')).toBe('Hello')
    })

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('')
    })

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A')
    })
  })

  describe('formatFileSize', () => {
    it('should format 0 as "0 Bytes"', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
    })

    it('should format 1024 as "1 KB"', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
    })

    it('should format 1048576 as "1 MB"', () => {
      expect(formatFileSize(1048576)).toBe('1 MB')
    })

    it('should format with decimals correctly', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB')
    })

    it('should handle large files (GB)', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB')
    })
  })
})

import { describe, it, expect } from 'vitest'
import { formatCurrency, parseCurrency } from '@/lib/formatters/currency'

describe('Currency Formatters', () => {
  describe('formatCurrency', () => {
    it('should format 1000 as currency with proper separators', () => {
      const result = formatCurrency(1000)
      expect(result).toMatch(/R\$\s*1\.000,00/)
    })

    it('should format 0.5 as currency', () => {
      const result = formatCurrency(0.5)
      expect(result).toMatch(/R\$\s*0,50/)
    })

    it('should format 0 as currency', () => {
      const result = formatCurrency(0)
      expect(result).toMatch(/R\$\s*0,00/)
    })

    it('should format negative values', () => {
      const result = formatCurrency(-100)
      expect(result).toContain('100,00')
      expect(result).toContain('-')
    })

    it('should format large numbers correctly', () => {
      const result = formatCurrency(1000000)
      expect(result).toMatch(/1\.000\.000,00/)
    })
  })

  describe('parseCurrency', () => {
    it('should parse "R$ 1.000,00" to 1000', () => {
      expect(parseCurrency('R$ 1.000,00')).toBe(1000)
    })

    it('should parse "R$ 0,50" to 0.5', () => {
      expect(parseCurrency('R$ 0,50')).toBe(0.5)
    })

    it('should handle values without R$ symbol', () => {
      expect(parseCurrency('1.000,00')).toBe(1000)
    })

    it('should handle values with extra spaces', () => {
      expect(parseCurrency('R$ 1.000,00 ')).toBe(1000)
    })
  })
})

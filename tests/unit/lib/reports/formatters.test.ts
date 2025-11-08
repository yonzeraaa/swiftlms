import { describe, it, expect } from 'vitest'
import {
  formatNumber,
  formatCompactNumber,
  formatCurrency,
  formatPercentage,
  formatDuration,
  formatBytes,
  truncateText,
  capitalizeWords,
  removeAccents,
  formatCPF,
  formatCNPJ,
  formatPhone,
  formatCEP,
  stringToColor,
  getInitials,
  formatStatus,
  calculateChangePercentage,
  isValidEmail,
  isValidCPF,
  generateSlug,
} from '@/lib/reports/formatters'

describe('reports/formatters', () => {
  describe('formatNumber', () => {
    it('should format numbers with default decimals', () => {
      expect(formatNumber(1000)).toBe('1.000')
      expect(formatNumber(1234567)).toBe('1.234.567')
    })

    it('should format numbers with specified decimals', () => {
      expect(formatNumber(1234.5678, 2)).toBe('1.234,57')
      expect(formatNumber(100, 2)).toBe('100,00')
    })

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0')
      expect(formatNumber(0, 2)).toBe('0,00')
    })
  })

  describe('formatCompactNumber', () => {
    it('should not compact numbers less than 1000', () => {
      expect(formatCompactNumber(500)).toBe('500')
      expect(formatCompactNumber(999)).toBe('999')
    })

    it('should format thousands with K', () => {
      expect(formatCompactNumber(1000)).toBe('1.0K')
      expect(formatCompactNumber(1500)).toBe('1.5K')
      expect(formatCompactNumber(999999)).toBe('1000.0K')
    })

    it('should format millions with M', () => {
      expect(formatCompactNumber(1000000)).toBe('1.0M')
      expect(formatCompactNumber(2500000)).toBe('2.5M')
    })

    it('should format billions with B', () => {
      expect(formatCompactNumber(1000000000)).toBe('1.0B')
      expect(formatCompactNumber(3500000000)).toBe('3.5B')
    })
  })

  describe('formatCurrency', () => {
    it('should format currency with cents by default', () => {
      const result = formatCurrency(1234.56)
      expect(result).toContain('1.234,56')
      expect(result).toContain('R$')
    })

    it('should format currency without cents when specified', () => {
      const result = formatCurrency(1234.56, false)
      expect(result).toContain('1.235')
      expect(result).not.toContain(',')
    })

    it('should handle zero', () => {
      const result = formatCurrency(0)
      expect(result).toContain('0,00')
    })
  })

  describe('formatPercentage', () => {
    it('should format percentage with default decimals', () => {
      expect(formatPercentage(75.5)).toBe('75,5%')
    })

    it('should format percentage with specified decimals', () => {
      expect(formatPercentage(75.567, 2)).toBe('75,57%')
      expect(formatPercentage(100, 0)).toBe('100%')
    })
  })

  describe('formatDuration', () => {
    it('should format minutes only', () => {
      expect(formatDuration(30)).toBe('30 min')
      expect(formatDuration(59)).toBe('59 min')
    })

    it('should format hours only', () => {
      expect(formatDuration(60)).toBe('1h')
      expect(formatDuration(120)).toBe('2h')
    })

    it('should format hours and minutes', () => {
      expect(formatDuration(90)).toBe('1h 30min')
      expect(formatDuration(125)).toBe('2h 5min')
    })

    it('should handle zero', () => {
      expect(formatDuration(0)).toBe('0 min')
    })
  })

  describe('formatBytes', () => {
    it('should format bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes')
      expect(formatBytes(500)).toBe('500 Bytes')
    })

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB')
      expect(formatBytes(1536)).toBe('1.5 KB')
    })

    it('should format megabytes', () => {
      expect(formatBytes(1048576)).toBe('1 MB')
      expect(formatBytes(5242880)).toBe('5 MB')
    })

    it('should format gigabytes', () => {
      expect(formatBytes(1073741824)).toBe('1 GB')
    })

    it('should handle custom decimals', () => {
      expect(formatBytes(1536, 0)).toBe('2 KB')
      expect(formatBytes(1536, 3)).toBe('1.5 KB')
    })
  })

  describe('truncateText', () => {
    it('should not truncate short text', () => {
      expect(truncateText('Hello', 10)).toBe('Hello')
    })

    it('should truncate long text', () => {
      expect(truncateText('Hello World!', 5)).toBe('Hello...')
    })

    it('should handle exact length', () => {
      expect(truncateText('Hello', 5)).toBe('Hello')
    })
  })

  describe('capitalizeWords', () => {
    it('should capitalize first letter of each word', () => {
      expect(capitalizeWords('hello world')).toBe('Hello World')
      expect(capitalizeWords('the quick brown fox')).toBe('The Quick Brown Fox')
    })

    it('should handle single word', () => {
      expect(capitalizeWords('hello')).toBe('Hello')
    })

    it('should handle already capitalized', () => {
      expect(capitalizeWords('Hello World')).toBe('Hello World')
    })
  })

  describe('removeAccents', () => {
    it('should remove Portuguese accents', () => {
      expect(removeAccents('José')).toBe('Jose')
      expect(removeAccents('São Paulo')).toBe('Sao Paulo')
      expect(removeAccents('açúcar')).toBe('acucar')
    })

    it('should handle text without accents', () => {
      expect(removeAccents('Hello World')).toBe('Hello World')
    })
  })

  describe('formatCPF', () => {
    it('should format valid CPF', () => {
      expect(formatCPF('12345678901')).toBe('123.456.789-01')
    })

    it('should format CPF with existing punctuation', () => {
      expect(formatCPF('123.456.789-01')).toBe('123.456.789-01')
    })

    it('should not format invalid length', () => {
      expect(formatCPF('123')).toBe('123')
      expect(formatCPF('123456789012345')).toBe('123456789012345')
    })
  })

  describe('formatCNPJ', () => {
    it('should format valid CNPJ', () => {
      expect(formatCNPJ('12345678000190')).toBe('12.345.678/0001-90')
    })

    it('should not format invalid length', () => {
      expect(formatCNPJ('123')).toBe('123')
    })
  })

  describe('formatPhone', () => {
    it('should format 10-digit phone', () => {
      expect(formatPhone('1234567890')).toBe('(12) 3456-7890')
    })

    it('should format 11-digit phone', () => {
      expect(formatPhone('12345678901')).toBe('(12) 34567-8901')
    })

    it('should not format invalid length', () => {
      expect(formatPhone('123')).toBe('123')
    })

    it('should handle already formatted phone', () => {
      expect(formatPhone('(12) 3456-7890')).toBe('(12) 3456-7890')
    })
  })

  describe('formatCEP', () => {
    it('should format valid CEP', () => {
      expect(formatCEP('12345678')).toBe('12345-678')
    })

    it('should not format invalid length', () => {
      expect(formatCEP('123')).toBe('123')
    })
  })

  describe('stringToColor', () => {
    it('should generate consistent color for same string', () => {
      const color1 = stringToColor('test')
      const color2 = stringToColor('test')
      expect(color1).toBe(color2)
    })

    it('should generate different colors for different strings', () => {
      const color1 = stringToColor('test1')
      const color2 = stringToColor('test2')
      expect(color1).not.toBe(color2)
    })

    it('should return HSL format', () => {
      const color = stringToColor('test')
      expect(color).toMatch(/^hsl\(\d+, 70%, 50%\)$/)
    })
  })

  describe('getInitials', () => {
    it('should get initials from full name', () => {
      expect(getInitials('John Doe')).toBe('JD')
      expect(getInitials('Maria Silva Santos')).toBe('MS')
    })

    it('should handle single name', () => {
      expect(getInitials('John')).toBe('J')
    })

    it('should return max 2 characters', () => {
      expect(getInitials('A B C D')).toBe('AB')
    })

    it('should return uppercase', () => {
      expect(getInitials('john doe')).toBe('JD')
    })
  })

  describe('formatStatus', () => {
    it('should format known statuses', () => {
      expect(formatStatus('active')).toEqual({ label: 'Ativo', color: 'green' })
      expect(formatStatus('pending')).toEqual({ label: 'Pendente', color: 'yellow' })
      expect(formatStatus('rejected')).toEqual({ label: 'Rejeitado', color: 'red' })
    })

    it('should handle unknown status', () => {
      const result = formatStatus('unknown_status')
      expect(result.label).toBe('Unknown_status')
      expect(result.color).toBe('gray')
    })

    it('should capitalize unknown status', () => {
      const result = formatStatus('custom status')
      expect(result.label).toBe('Custom Status')
    })
  })

  describe('calculateChangePercentage', () => {
    it('should calculate positive change', () => {
      const result = calculateChangePercentage(100, 150)
      expect(result.value).toBe(50)
      expect(result.direction).toBe('up')
    })

    it('should calculate negative change', () => {
      const result = calculateChangePercentage(100, 75)
      expect(result.value).toBe(25)
      expect(result.direction).toBe('down')
    })

    it('should handle no change', () => {
      const result = calculateChangePercentage(100, 100)
      expect(result.value).toBe(0)
      expect(result.direction).toBe('neutral')
    })

    it('should handle zero old value', () => {
      const result = calculateChangePercentage(0, 100)
      expect(result.value).toBe(0)
      expect(result.direction).toBe('neutral')
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('test @example.com')).toBe(false)
    })
  })

  describe('isValidCPF', () => {
    it('should validate correct CPF', () => {
      expect(isValidCPF('11144477735')).toBe(true)
    })

    it('should reject invalid CPF', () => {
      expect(isValidCPF('11111111111')).toBe(false) // All same digits
      expect(isValidCPF('123')).toBe(false) // Too short
      expect(isValidCPF('12345678901')).toBe(false) // Invalid checksum
    })

    it('should handle formatted CPF', () => {
      expect(isValidCPF('111.444.777-35')).toBe(true)
    })
  })

  describe('generateSlug', () => {
    it('should generate slug from text', () => {
      expect(generateSlug('Hello World')).toBe('hello-world')
      expect(generateSlug('This is a Test')).toBe('this-is-a-test')
    })

    it('should remove accents', () => {
      expect(generateSlug('São Paulo')).toBe('sao-paulo')
      expect(generateSlug('José da Silva')).toBe('jose-da-silva')
    })

    it('should remove special characters', () => {
      expect(generateSlug('Hello@World!')).toBe('helloworld')
    })

    it('should handle multiple spaces and dashes', () => {
      expect(generateSlug('hello   world---test')).toBe('hello-world-test')
    })

    it('should handle leading/trailing spaces', () => {
      const result = generateSlug('  hello world  ')
      expect(result).toContain('hello-world')
    })
  })
})

import { describe, it, expect } from 'vitest'
import { validateEmail, normalizeEmail } from '@/lib/validators/email'

describe('Email Validators', () => {
  describe('validateEmail', () => {
    it('should accept valid email', () => {
      expect(validateEmail('user@example.com')).toBe(true)
      expect(validateEmail('test.user@domain.co')).toBe(true)
      expect(validateEmail('user+tag@example.com')).toBe(true)
    })

    it('should reject email without @', () => {
      expect(validateEmail('userexample.com')).toBe(false)
    })

    it('should reject email without domain', () => {
      expect(validateEmail('user@')).toBe(false)
      expect(validateEmail('user@domain')).toBe(false)
    })

    it('should reject empty email', () => {
      expect(validateEmail('')).toBe(false)
    })

    it('should reject email with spaces', () => {
      expect(validateEmail('user @example.com')).toBe(false)
      expect(validateEmail('user@ example.com')).toBe(false)
    })

    it('should handle null/undefined gracefully', () => {
      expect(validateEmail(null as any)).toBe(false)
      expect(validateEmail(undefined as any)).toBe(false)
    })
  })

  describe('normalizeEmail', () => {
    it('should trim and lowercase email', () => {
      expect(normalizeEmail(' User@Example.COM ')).toBe('user@example.com')
    })

    it('should handle already normalized email', () => {
      expect(normalizeEmail('user@example.com')).toBe('user@example.com')
    })
  })
})

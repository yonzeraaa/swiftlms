import { describe, it, expect } from 'vitest'
import { validatePassword, isPasswordStrong } from '@/lib/validators/password'

describe('Password Validators', () => {
  describe('validatePassword', () => {
    it('should accept strong password (8+ chars, uppercase, lowercase, number)', () => {
      const result = validatePassword('Senha123')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject password shorter than 8 characters', () => {
      const result = validatePassword('Sen123')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Senha deve ter no mínimo 8 caracteres')
    })

    it('should reject password without number', () => {
      const result = validatePassword('SenhaForte')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Senha deve conter pelo menos um número')
    })

    it('should reject password without uppercase', () => {
      const result = validatePassword('senha123')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Senha deve conter pelo menos uma letra maiúscula')
    })

    it('should reject password without lowercase', () => {
      const result = validatePassword('SENHA123')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Senha deve conter pelo menos uma letra minúscula')
    })

    it('should return multiple errors for weak password', () => {
      const result = validatePassword('abc')

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
      expect(result.errors).toContain('Senha deve ter no mínimo 8 caracteres')
      expect(result.errors).toContain('Senha deve conter pelo menos uma letra maiúscula')
      expect(result.errors).toContain('Senha deve conter pelo menos um número')
    })

    it('should reject empty password', () => {
      const result = validatePassword('')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Senha é obrigatória')
    })
  })

  describe('isPasswordStrong', () => {
    it('should return true for strong password', () => {
      expect(isPasswordStrong('Senha123')).toBe(true)
    })

    it('should return false for weak password', () => {
      expect(isPasswordStrong('senha')).toBe(false)
    })
  })
})

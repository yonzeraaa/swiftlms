import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Translators, Calculators, Formatters, Validators, Helpers } from '@/lib/excel-template-mappers/shared-utils'

describe('shared-utils', () => {
  describe('Translators', () => {
    describe('role', () => {
      it('should translate admin role', () => {
        expect(Translators.role('admin')).toBe('Administrador')
      })

      it('should translate instructor role', () => {
        expect(Translators.role('instructor')).toBe('Professor')
      })

      it('should translate student role', () => {
        expect(Translators.role('student')).toBe('Estudante')
      })

      it('should return default for unknown role', () => {
        expect(Translators.role('unknown')).toBe('Estudante')
      })
    })

    describe('userStatus', () => {
      it('should translate active status', () => {
        expect(Translators.userStatus('active')).toBe('Ativo')
      })

      it('should translate inactive status', () => {
        expect(Translators.userStatus('inactive')).toBe('Inativo')
      })

      it('should translate suspended status', () => {
        expect(Translators.userStatus('suspended')).toBe('Suspenso')
      })

      it('should return default for unknown status', () => {
        expect(Translators.userStatus('unknown')).toBe('Desconhecido')
      })
    })

    describe('enrollmentStatus', () => {
      it('should translate completed status', () => {
        expect(Translators.enrollmentStatus('completed')).toBe('Concluído')
      })

      it('should translate dropped status', () => {
        expect(Translators.enrollmentStatus('dropped')).toBe('Evadido')
      })

      it('should translate cancelled status', () => {
        expect(Translators.enrollmentStatus('cancelled')).toBe('Cancelado')
      })

      it('should return Inativo when userStatus is inactive', () => {
        expect(Translators.enrollmentStatus('active', 'inactive')).toBe('Inativo')
      })

      it('should return Ativo for active enrollment with active user', () => {
        expect(Translators.enrollmentStatus('active', 'active')).toBe('Ativo')
      })

      it('should return Ativo for unknown status', () => {
        expect(Translators.enrollmentStatus('unknown')).toBe('Ativo')
      })
    })

    describe('testStatus', () => {
      it('should return Realizado when submitted is true', () => {
        expect(Translators.testStatus(true)).toBe('Realizado')
      })

      it('should return Não Realizado when submitted is false', () => {
        expect(Translators.testStatus(false)).toBe('Não Realizado')
      })
    })
  })

  describe('Calculators', () => {
    describe('progress', () => {
      it('should calculate progress percentage', () => {
        expect(Calculators.progress(5, 10)).toBe(50.0)
      })

      it('should handle zero total', () => {
        expect(Calculators.progress(5, 0)).toBe(0)
      })

      it('should round to 1 decimal place', () => {
        expect(Calculators.progress(1, 3)).toBe(33.3)
      })

      it('should handle 100% progress', () => {
        expect(Calculators.progress(10, 10)).toBe(100.0)
      })

      it('should handle 0% progress', () => {
        expect(Calculators.progress(0, 10)).toBe(0.0)
      })
    })

    describe('lessonProgress', () => {
      it('should calculate lesson progress correctly', () => {
        const lessons = [
          { is_completed: true },
          { is_completed: true },
          { is_completed: false },
          { is_completed: false },
        ]
        expect(Calculators.lessonProgress(lessons)).toBe(50.0)
      })

      it('should handle empty lessons array', () => {
        expect(Calculators.lessonProgress([])).toBe(0)
      })

      it('should handle all completed lessons', () => {
        const lessons = [
          { is_completed: true },
          { is_completed: true },
        ]
        expect(Calculators.lessonProgress(lessons)).toBe(100.0)
      })

      it('should handle no completed lessons', () => {
        const lessons = [
          { is_completed: false },
          { is_completed: false },
        ]
        expect(Calculators.lessonProgress(lessons)).toBe(0.0)
      })
    })

    describe('generalAverage', () => {
      it('should calculate weighted average (testes × 1 + TCC × 2) / 3', () => {
        expect(Calculators.generalAverage(80, 90)).toBe(86.7)
      })

      it('should round to 1 decimal place', () => {
        expect(Calculators.generalAverage(70, 80)).toBe(76.7)
      })

      it('should handle equal scores', () => {
        expect(Calculators.generalAverage(85, 85)).toBe(85.0)
      })

      it('should handle zero scores', () => {
        expect(Calculators.generalAverage(0, 0)).toBe(0.0)
      })
    })

    describe('hoursBetween', () => {
      it('should calculate hours between two dates', () => {
        const start = new Date('2024-01-01T10:00:00')
        const end = new Date('2024-01-01T15:00:00')
        expect(Calculators.hoursBetween(start, end)).toBe(5)
      })

      it('should handle dates in reverse order (uses abs)', () => {
        const start = new Date('2024-01-01T15:00:00')
        const end = new Date('2024-01-01T10:00:00')
        expect(Calculators.hoursBetween(start, end)).toBe(5)
      })

      it('should floor the result', () => {
        const start = new Date('2024-01-01T10:00:00')
        const end = new Date('2024-01-01T12:30:00')
        expect(Calculators.hoursBetween(start, end)).toBe(2)
      })

      it('should handle same date', () => {
        const date = new Date('2024-01-01T10:00:00')
        expect(Calculators.hoursBetween(date, date)).toBe(0)
      })
    })

    describe('average', () => {
      it('should calculate average of numbers', () => {
        expect(Calculators.average([10, 20, 30])).toBe(20.0)
      })

      it('should handle empty array', () => {
        expect(Calculators.average([])).toBe(0)
      })

      it('should round to 1 decimal place', () => {
        expect(Calculators.average([10, 20, 25])).toBe(18.3)
      })

      it('should handle single number', () => {
        expect(Calculators.average([42])).toBe(42.0)
      })
    })

    describe('isApproved', () => {
      it('should return true when average >= threshold', () => {
        expect(Calculators.isApproved(75, 70)).toBe(true)
      })

      it('should return false when average < threshold', () => {
        expect(Calculators.isApproved(65, 70)).toBe(false)
      })

      it('should use default threshold of 70', () => {
        expect(Calculators.isApproved(70)).toBe(true)
        expect(Calculators.isApproved(69)).toBe(false)
      })

      it('should handle exact threshold', () => {
        expect(Calculators.isApproved(70, 70)).toBe(true)
      })
    })
  })

  describe('Formatters', () => {
    describe('date', () => {
      it('should format date as dd/MM/yyyy', () => {
        const result = Formatters.date('2024-01-15T12:00:00Z')
        expect(result).toMatch(/\d{2}\/01\/2024/)
      })

      it('should handle Date object', () => {
        const date = new Date('2024-01-15T12:00:00Z')
        const result = Formatters.date(date)
        expect(result).toMatch(/\d{2}\/01\/2024/)
      })

      it('should return - for null', () => {
        expect(Formatters.date(null)).toBe('-')
      })

      it('should return - for invalid date', () => {
        expect(Formatters.date('invalid-date')).toBe('-')
      })
    })

    describe('datetime', () => {
      it('should format datetime as dd/MM/yyyy HH:mm', () => {
        const result = Formatters.datetime('2024-01-15T14:30:00Z')
        expect(result).toMatch(/\d{2}\/01\/2024 \d{2}:\d{2}/)
      })

      it('should handle Date object', () => {
        const date = new Date('2024-01-15T14:30:00Z')
        const result = Formatters.datetime(date)
        expect(result).toMatch(/\d{2}\/01\/2024 \d{2}:\d{2}/)
      })

      it('should return - for null', () => {
        expect(Formatters.datetime(null)).toBe('-')
      })

      it('should return - for invalid date', () => {
        expect(Formatters.datetime('invalid-date')).toBe('-')
      })
    })

    describe('number', () => {
      it('should round to 1 decimal place', () => {
        expect(Formatters.number(10.456)).toBe(10.5)
      })

      it('should handle integers', () => {
        expect(Formatters.number(10)).toBe(10.0)
      })

      it('should handle zero', () => {
        expect(Formatters.number(0)).toBe(0.0)
      })

      it('should handle negative numbers', () => {
        expect(Formatters.number(-5.67)).toBe(-5.7)
      })
    })

    describe('institution', () => {
      let originalEnv: string | undefined

      beforeEach(() => {
        originalEnv = process.env.NEXT_PUBLIC_INSTITUTION_NAME
      })

      afterEach(() => {
        if (originalEnv !== undefined) {
          process.env.NEXT_PUBLIC_INSTITUTION_NAME = originalEnv
        } else {
          delete process.env.NEXT_PUBLIC_INSTITUTION_NAME
        }
      })

      it('should return env var when set', () => {
        process.env.NEXT_PUBLIC_INSTITUTION_NAME = 'Minha Instituição'
        expect(Formatters.institution()).toBe('Minha Instituição')
      })

      it('should return default when env var not set', () => {
        delete process.env.NEXT_PUBLIC_INSTITUTION_NAME
        expect(Formatters.institution()).toBe('IPETEC / UCP')
      })
    })

    describe('moduleCode', () => {
      it('should format module code with zero padding', () => {
        expect(Formatters.moduleCode(0)).toBe('CMN01')
        expect(Formatters.moduleCode(1)).toBe('CMN02')
        expect(Formatters.moduleCode(9)).toBe('CMN10')
      })

      it('should handle double digit indices', () => {
        expect(Formatters.moduleCode(10)).toBe('CMN11')
        expect(Formatters.moduleCode(99)).toBe('CMN100')
      })
    })

    describe('lessonCode', () => {
      it('should format lesson code with zero padding', () => {
        expect(Formatters.lessonCode(0, 0)).toBe('CMN0101')
        expect(Formatters.lessonCode(0, 1)).toBe('CMN0102')
        expect(Formatters.lessonCode(1, 0)).toBe('CMN0201')
      })

      it('should handle double digit indices', () => {
        expect(Formatters.lessonCode(9, 9)).toBe('CMN1010')
        expect(Formatters.lessonCode(10, 10)).toBe('CMN1111')
      })
    })
  })

  describe('Validators', () => {
    describe('isUUID', () => {
      it('should validate correct UUIDs', () => {
        expect(Validators.isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
        expect(Validators.isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
      })

      it('should reject invalid UUIDs', () => {
        expect(Validators.isUUID('not-a-uuid')).toBe(false)
        expect(Validators.isUUID('123e4567-e89b-12d3-a456')).toBe(false)
        expect(Validators.isUUID('')).toBe(false)
      })

      it('should reject UUIDs with wrong format', () => {
        expect(Validators.isUUID('123e4567e89b12d3a456426614174000')).toBe(false)
      })
    })

    describe('isEmail', () => {
      it('should validate correct emails', () => {
        expect(Validators.isEmail('test@example.com')).toBe(true)
        expect(Validators.isEmail('user.name@domain.co.uk')).toBe(true)
      })

      it('should reject invalid emails', () => {
        expect(Validators.isEmail('not-an-email')).toBe(false)
        expect(Validators.isEmail('missing@domain')).toBe(false)
        expect(Validators.isEmail('@domain.com')).toBe(false)
        expect(Validators.isEmail('user@')).toBe(false)
      })

      it('should reject emails with spaces', () => {
        expect(Validators.isEmail('user name@domain.com')).toBe(false)
      })
    })

    describe('isValidDateRange', () => {
      it('should validate correct date ranges', () => {
        expect(Validators.isValidDateRange('2024-01-01', '2024-12-31')).toBe(true)
      })

      it('should allow equal dates', () => {
        expect(Validators.isValidDateRange('2024-01-01', '2024-01-01')).toBe(true)
      })

      it('should reject invalid date ranges', () => {
        expect(Validators.isValidDateRange('2024-12-31', '2024-01-01')).toBe(false)
      })
    })
  })

  describe('Helpers', () => {
    describe('defaultValue', () => {
      it('should return value when not null/undefined', () => {
        expect(Helpers.defaultValue('test', 'default')).toBe('test')
        expect(Helpers.defaultValue(0, 10)).toBe(0)
        expect(Helpers.defaultValue(false, true)).toBe(false)
      })

      it('should return default when value is null', () => {
        expect(Helpers.defaultValue(null, 'default')).toBe('default')
      })

      it('should return default when value is undefined', () => {
        expect(Helpers.defaultValue(undefined, 'default')).toBe('default')
      })
    })

    describe('minutesToHours', () => {
      it('should convert minutes to hours', () => {
        expect(Helpers.minutesToHours(60)).toBe(1)
        expect(Helpers.minutesToHours(120)).toBe(2)
        expect(Helpers.minutesToHours(90)).toBe(2)
      })

      it('should round to nearest hour', () => {
        expect(Helpers.minutesToHours(45)).toBe(1)
        expect(Helpers.minutesToHours(30)).toBe(1)
      })

      it('should handle zero', () => {
        expect(Helpers.minutesToHours(0)).toBe(0)
      })
    })

    describe('createLookupMap', () => {
      it('should create map from array with id key', () => {
        const items = [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
        ]
        const map = Helpers.createLookupMap(items)
        expect(map.get('1')).toEqual({ id: '1', name: 'Item 1' })
        expect(map.get('2')).toEqual({ id: '2', name: 'Item 2' })
      })

      it('should handle custom key field', () => {
        const items = [
          { id: '1', code: 'A', name: 'Item A' },
          { id: '2', code: 'B', name: 'Item B' },
        ]
        const map = Helpers.createLookupMap(items, 'code')
        expect(map.get('A')).toEqual({ id: '1', code: 'A', name: 'Item A' })
        expect(map.get('B')).toEqual({ id: '2', code: 'B', name: 'Item B' })
      })

      it('should handle empty array', () => {
        const map = Helpers.createLookupMap([])
        expect(map.size).toBe(0)
      })
    })

    describe('unique', () => {
      it('should remove duplicates by key', () => {
        const items = [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
          { id: '1', name: 'Item 1 Duplicate' },
        ]
        const result = Helpers.unique(items, 'id')
        expect(result).toHaveLength(2)
        expect(result[0].id).toBe('1')
        expect(result[1].id).toBe('2')
      })

      it('should keep first occurrence', () => {
        const items = [
          { id: '1', name: 'First' },
          { id: '1', name: 'Second' },
        ]
        const result = Helpers.unique(items, 'id')
        expect(result).toHaveLength(1)
        expect(result[0].name).toBe('First')
      })

      it('should handle empty array', () => {
        const result = Helpers.unique([], 'id')
        expect(result).toHaveLength(0)
      })

      it('should handle array with no duplicates', () => {
        const items = [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
        ]
        const result = Helpers.unique(items, 'id')
        expect(result).toHaveLength(2)
      })
    })
  })
})

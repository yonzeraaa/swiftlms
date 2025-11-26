import { describe, it, expect } from 'vitest'
import { GradeCalculator, type TestAttempt, type GradeOverride } from '@/lib/services/grade-calculator'

describe('GradeCalculator', () => {
  describe('calculateTestsAverage', () => {
    it('should calculate average of completed tests', () => {
      const attempts: TestAttempt[] = [
        { test_id: '1', score: 80, submitted_at: '2024-01-01' },
        { test_id: '2', score: 90, submitted_at: '2024-01-02' },
      ]

      expect(GradeCalculator.calculateTestsAverage(attempts)).toBe(85.0)
    })

    it('should filter out unsubmitted attempts', () => {
      const attempts: TestAttempt[] = [
        { test_id: '1', score: 80, submitted_at: '2024-01-01' },
        { test_id: '2', score: 90, submitted_at: null },
      ]

      expect(GradeCalculator.calculateTestsAverage(attempts)).toBe(80.0)
    })

    it('should filter out attempts with score 0', () => {
      const attempts: TestAttempt[] = [
        { test_id: '1', score: 80, submitted_at: '2024-01-01' },
        { test_id: '2', score: 0, submitted_at: '2024-01-02' },
      ]

      expect(GradeCalculator.calculateTestsAverage(attempts)).toBe(80.0)
    })

    it('should return 0 for empty array', () => {
      expect(GradeCalculator.calculateTestsAverage([])).toBe(0)
    })

    it('should return 0 when all attempts are incomplete', () => {
      const attempts: TestAttempt[] = [
        { test_id: '1', score: 0, submitted_at: null },
        { test_id: '2', score: 0, submitted_at: null },
      ]

      expect(GradeCalculator.calculateTestsAverage(attempts)).toBe(0)
    })

    it('should round to 1 decimal place', () => {
      const attempts: TestAttempt[] = [
        { test_id: '1', score: 85, submitted_at: '2024-01-01' },
        { test_id: '2', score: 87, submitted_at: '2024-01-02' },
      ]

      expect(GradeCalculator.calculateTestsAverage(attempts)).toBe(86.0)
    })
  })

  describe('average', () => {
    it('should calculate average of numbers', () => {
      expect(GradeCalculator.average([80, 90, 70])).toBe(80.0)
    })

    it('should return 0 for empty array', () => {
      expect(GradeCalculator.average([])).toBe(0)
    })

    it('should round to 1 decimal place', () => {
      expect(GradeCalculator.average([85, 87])).toBe(86.0)
    })

    it('should handle single value', () => {
      expect(GradeCalculator.average([75])).toBe(75.0)
    })
  })

  describe('calculateFinalAverage', () => {
    it('should calculate weighted average without overrides', () => {
      const result = GradeCalculator.calculateFinalAverage(80, 90)

      expect(result.finalAverage).toBe(85.0)
      expect(result.testsAverageEffective).toBe(80)
      expect(result.tccGradeEffective).toBe(90)
      expect(result.denominator).toBe(2)
    })

    it('should handle null TCC grade', () => {
      const result = GradeCalculator.calculateFinalAverage(80, null)

      expect(result.tccGradeEffective).toBe(0)
      expect(result.tccGradeRaw).toBeNull()
      expect(result.finalAverage).toBe(40.0) // (80*1 + 0*1) / 2
    })

    it('should apply tests average override', () => {
      const overrides: GradeOverride = {
        testsAverageOverride: 95,
      }

      const result = GradeCalculator.calculateFinalAverage(80, 90, overrides)

      expect(result.testsAverageEffective).toBe(95)
      expect(result.testsAverageRaw).toBe(80)
    })

    it('should apply TCC grade override', () => {
      const overrides: GradeOverride = {
        tccGradeOverride: 95,
      }

      const result = GradeCalculator.calculateFinalAverage(80, 90, overrides)

      expect(result.tccGradeEffective).toBe(95)
      expect(result.tccGradeRaw).toBe(90)
    })

    it('should apply custom weights', () => {
      const overrides: GradeOverride = {
        testsWeight: 2,
        tccWeight: 1,
      }

      const result = GradeCalculator.calculateFinalAverage(80, 90, overrides)

      // (80*2 + 90*1) / 3 = 83.33
      expect(result.finalAverage).toBe(83.3)
      expect(result.testsWeight).toBe(2)
      expect(result.tccWeight).toBe(1)
      expect(result.denominator).toBe(3)
    })

    it('should handle zero weights gracefully', () => {
      const overrides: GradeOverride = {
        testsWeight: 0,
        tccWeight: 0,
      }

      const result = GradeCalculator.calculateFinalAverage(80, 90, overrides)

      expect(result.finalAverage).toBe(0)
      expect(result.denominator).toBe(0)
    })

    it('should prevent negative weights', () => {
      const overrides: GradeOverride = {
        testsWeight: -1,
        tccWeight: -1,
      }

      const result = GradeCalculator.calculateFinalAverage(80, 90, overrides)

      expect(result.testsWeight).toBe(0)
      expect(result.tccWeight).toBe(0)
    })
  })

  describe('generalAverage', () => {
    it('should calculate weighted average (tests: 1, TCC: 2)', () => {
      const result = GradeCalculator.generalAverage(80, 90)

      // (80*1 + 90*2) / 3 = 86.66
      expect(result).toBe(86.7)
    })

    it('should handle zero values', () => {
      expect(GradeCalculator.generalAverage(0, 0)).toBe(0)
    })

    it('should round to 1 decimal place', () => {
      const result = GradeCalculator.generalAverage(85, 87)

      // (85*1 + 87*2) / 3 = 86.33
      expect(result).toBe(86.3)
    })
  })

  describe('isApproved', () => {
    it('should return true for average >= 70', () => {
      expect(GradeCalculator.isApproved(70)).toBe(true)
      expect(GradeCalculator.isApproved(85)).toBe(true)
      expect(GradeCalculator.isApproved(100)).toBe(true)
    })

    it('should return false for average < 70', () => {
      expect(GradeCalculator.isApproved(69.9)).toBe(false)
      expect(GradeCalculator.isApproved(50)).toBe(false)
      expect(GradeCalculator.isApproved(0)).toBe(false)
    })

    it('should support custom threshold', () => {
      expect(GradeCalculator.isApproved(75, 80)).toBe(false)
      expect(GradeCalculator.isApproved(85, 80)).toBe(true)
    })
  })

  describe('calculateProgress', () => {
    it('should calculate percentage progress', () => {
      expect(GradeCalculator.calculateProgress(5, 10)).toBe(50)
      expect(GradeCalculator.calculateProgress(7, 10)).toBe(70)
      expect(GradeCalculator.calculateProgress(10, 10)).toBe(100)
    })

    it('should return 0 for total of 0', () => {
      expect(GradeCalculator.calculateProgress(0, 0)).toBe(0)
    })

    it('should round to nearest integer', () => {
      expect(GradeCalculator.calculateProgress(1, 3)).toBe(33)
      expect(GradeCalculator.calculateProgress(2, 3)).toBe(67)
    })

    it('should handle 0 completed', () => {
      expect(GradeCalculator.calculateProgress(0, 10)).toBe(0)
    })
  })

  describe('isValidGrade', () => {
    it('should validate grades in range 0-100', () => {
      expect(GradeCalculator.isValidGrade(0)).toBe(true)
      expect(GradeCalculator.isValidGrade(50)).toBe(true)
      expect(GradeCalculator.isValidGrade(100)).toBe(true)
    })

    it('should reject grades outside range', () => {
      expect(GradeCalculator.isValidGrade(-1)).toBe(false)
      expect(GradeCalculator.isValidGrade(101)).toBe(false)
    })

    it('should reject null and undefined', () => {
      expect(GradeCalculator.isValidGrade(null)).toBe(false)
      expect(GradeCalculator.isValidGrade(undefined)).toBe(false)
    })
  })

  describe('normalizeGrade', () => {
    it('should return valid grades unchanged', () => {
      expect(GradeCalculator.normalizeGrade(50)).toBe(50)
      expect(GradeCalculator.normalizeGrade(85.5)).toBe(85.5)
    })

    it('should clamp grades below 0 to 0', () => {
      expect(GradeCalculator.normalizeGrade(-10)).toBe(0)
      expect(GradeCalculator.normalizeGrade(-0.1)).toBe(0)
    })

    it('should clamp grades above 100 to 100', () => {
      expect(GradeCalculator.normalizeGrade(110)).toBe(100)
      expect(GradeCalculator.normalizeGrade(100.1)).toBe(100)
    })

    it('should return null for non-numeric values', () => {
      expect(GradeCalculator.normalizeGrade('invalid')).toBeNull()
      expect(GradeCalculator.normalizeGrade(NaN)).toBeNull()
      expect(GradeCalculator.normalizeGrade(Infinity)).toBeNull()
      expect(GradeCalculator.normalizeGrade(undefined)).toBeNull()
    })

    it('should convert null to 0', () => {
      // Number(null) === 0 in JavaScript
      expect(GradeCalculator.normalizeGrade(null)).toBe(0)
    })

    it('should round to 1 decimal place', () => {
      expect(GradeCalculator.normalizeGrade(85.55)).toBe(85.6)
      expect(GradeCalculator.normalizeGrade(85.54)).toBe(85.5)
    })

    it('should convert string numbers', () => {
      expect(GradeCalculator.normalizeGrade('75')).toBe(75)
      expect(GradeCalculator.normalizeGrade('85.5')).toBe(85.5)
    })
  })
})

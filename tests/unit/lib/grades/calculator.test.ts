import { describe, it, expect } from 'vitest'
import {
  calculateTestGrade,
  calculateModuleGrade,
  calculateCourseGrade,
  isApproved,
  formatGrade,
  parseGrade,
} from '@/lib/grades/calculator'

describe('Grades Calculator', () => {
  describe('calculateTestGrade', () => {
    it('should return 10.0 for perfect score (10 of 10)', () => {
      const grade = calculateTestGrade({ correctAnswers: 10, totalQuestions: 10 })
      expect(grade).toBe(10.0)
    })

    it('should return 7.0 for partial score (7 of 10)', () => {
      const grade = calculateTestGrade({ correctAnswers: 7, totalQuestions: 10 })
      expect(grade).toBe(7.0)
    })

    it('should return 0 for zero score (0 of 10)', () => {
      const grade = calculateTestGrade({ correctAnswers: 0, totalQuestions: 10 })
      expect(grade).toBe(0)
    })

    it('should return 0 when total questions is 0', () => {
      const grade = calculateTestGrade({ correctAnswers: 0, totalQuestions: 0 })
      expect(grade).toBe(0)
    })

    it('should round to 1 decimal place', () => {
      const grade = calculateTestGrade({ correctAnswers: 7, totalQuestions: 9 })
      expect(grade).toBe(7.8)
    })
  })

  describe('calculateModuleGrade', () => {
    it('should calculate simple average when no weights provided', () => {
      const grade = calculateModuleGrade([8.0, 9.0, 7.0])
      expect(grade).toBe(8.0)
    })

    it('should calculate weighted average when weights provided', () => {
      const grade = calculateModuleGrade([8.0, 6.0], [2, 1])
      // (8*2 + 6*1) / (2+1) = 22/3 = 7.33...
      expect(grade).toBe(7.3)
    })

    it('should return 0 when no grades provided', () => {
      const grade = calculateModuleGrade([])
      expect(grade).toBe(0)
    })

    it('should handle single grade', () => {
      const grade = calculateModuleGrade([8.5])
      expect(grade).toBe(8.5)
    })
  })

  describe('calculateCourseGrade', () => {
    it('should aggregate module grades correctly', () => {
      const grade = calculateCourseGrade([8.0, 9.0, 7.0])
      expect(grade).toBe(8.0)
    })

    it('should return 0 for empty modules', () => {
      const grade = calculateCourseGrade([])
      expect(grade).toBe(0)
    })
  })

  describe('isApproved', () => {
    it('should return true if grade >= 7.0 (default passing grade)', () => {
      expect(isApproved(7.0)).toBe(true)
      expect(isApproved(7.5)).toBe(true)
      expect(isApproved(10.0)).toBe(true)
    })

    it('should return false if grade < 7.0', () => {
      expect(isApproved(6.9)).toBe(false)
      expect(isApproved(5.0)).toBe(false)
      expect(isApproved(0)).toBe(false)
    })

    it('should respect custom passing grade', () => {
      expect(isApproved(6.0, 6.0)).toBe(true)
      expect(isApproved(5.9, 6.0)).toBe(false)
    })
  })

  describe('formatGrade', () => {
    it('should format 10.0 as "10,0"', () => {
      expect(formatGrade(10.0)).toBe('10,0')
    })

    it('should format 7.5 as "7,5"', () => {
      expect(formatGrade(7.5)).toBe('7,5')
    })

    it('should always show 1 decimal place', () => {
      expect(formatGrade(8)).toBe('8,0')
    })
  })

  describe('parseGrade', () => {
    it('should convert "8,5" to 8.5', () => {
      expect(parseGrade('8,5')).toBe(8.5)
    })

    it('should convert "10,0" to 10.0', () => {
      expect(parseGrade('10,0')).toBe(10.0)
    })

    it('should handle already dot-formatted strings', () => {
      expect(parseGrade('7.5')).toBe(7.5)
    })
  })
})

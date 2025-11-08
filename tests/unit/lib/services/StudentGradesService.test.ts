import { describe, it, expect, beforeEach } from 'vitest'
import {
  StudentGradesService,
  type TestGrade,
  type GradeOverride,
} from '@/lib/services/StudentGradesService'

describe('StudentGradesService', () => {
  let service: StudentGradesService

  beforeEach(() => {
    service = new StudentGradesService()
  })

  const createGrade = (overrides?: Partial<TestGrade>): TestGrade => ({
    id: 'grade-1',
    user_id: 'user-1',
    test_id: 'test-1',
    course_id: 'course-1',
    subject_id: 'subject-1',
    best_score: 80,
    total_attempts: 1,
    last_attempt_date: '2024-01-15T00:00:00Z',
    ...overrides,
  })

  const createOverride = (overrides?: Partial<GradeOverride>): GradeOverride => ({
    id: 'override-1',
    user_id: 'user-1',
    test_id: 'test-1',
    original_score: 60,
    override_score: 80,
    reason: 'Correção de erro na avaliação',
    overridden_by: 'admin-1',
    overridden_at: '2024-01-20T00:00:00Z',
    ...overrides,
  })

  describe('calculateAverage', () => {
    it('should calculate average of grades', () => {
      const grades = [
        createGrade({ best_score: 80 }),
        createGrade({ best_score: 90 }),
        createGrade({ best_score: 70 }),
      ]

      expect(service.calculateAverage(grades)).toBe(80.0)
    })

    it('should return 0 for empty array', () => {
      expect(service.calculateAverage([])).toBe(0)
    })

    it('should round to 1 decimal place', () => {
      const grades = [
        createGrade({ best_score: 85 }),
        createGrade({ best_score: 73 }),
      ]

      expect(service.calculateAverage(grades)).toBe(79.0)
    })
  })

  describe('countPassedTests', () => {
    it('should count tests with score >= 70', () => {
      const grades = [
        createGrade({ best_score: 80 }),
        createGrade({ best_score: 60 }),
        createGrade({ best_score: 75 }),
        createGrade({ best_score: 65 }),
      ]

      expect(service.countPassedTests(grades)).toBe(2)
    })

    it('should support custom passing grade', () => {
      const grades = [
        createGrade({ best_score: 80 }),
        createGrade({ best_score: 85 }),
      ]

      expect(service.countPassedTests(grades, 90)).toBe(0)
      expect(service.countPassedTests(grades, 75)).toBe(2)
    })

    it('should return 0 for empty array', () => {
      expect(service.countPassedTests([])).toBe(0)
    })
  })

  describe('isPassingCourse', () => {
    it('should return true if average >= passing grade', () => {
      const grades = [
        createGrade({ best_score: 80 }),
        createGrade({ best_score: 75 }),
      ]

      expect(service.isPassingCourse(grades, 70)).toBe(true)
    })

    it('should return false if average < passing grade', () => {
      const grades = [
        createGrade({ best_score: 60 }),
        createGrade({ best_score: 65 }),
      ]

      expect(service.isPassingCourse(grades, 70)).toBe(false)
    })

    it('should return false for empty grades', () => {
      expect(service.isPassingCourse([], 70)).toBe(false)
    })
  })

  describe('generateGradeSummary', () => {
    it('should generate complete grade summary', () => {
      const grades = [
        createGrade({ best_score: 80 }),
        createGrade({ best_score: 90 }),
        createGrade({ best_score: 60 }),
        createGrade({ best_score: 75 }),
      ]

      const result = service.generateGradeSummary('user-1', 'course-1', grades, 5, 70)

      expect(result.user_id).toBe('user-1')
      expect(result.course_id).toBe('course-1')
      expect(result.total_tests).toBe(5)
      expect(result.completed_tests).toBe(4)
      expect(result.average_score).toBe(76.3)
      expect(result.passed_tests).toBe(3)
      expect(result.failed_tests).toBe(1)
      expect(result.is_passing).toBe(true)
      expect(result.best_score).toBe(90)
      expect(result.worst_score).toBe(60)
    })

    it('should handle empty grades', () => {
      const result = service.generateGradeSummary('user-1', 'course-1', [], 5, 70)

      expect(result.completed_tests).toBe(0)
      expect(result.average_score).toBe(0)
      expect(result.is_passing).toBe(false)
      expect(result.best_score).toBe(0)
      expect(result.worst_score).toBe(0)
    })
  })

  describe('validateGradeOverride', () => {
    it('should validate correct override parameters', () => {
      const result = service.validateGradeOverride(60, 80, 'Correção de erro na prova')

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return error if original score is invalid (<0)', () => {
      const result = service.validateGradeOverride(-10, 80, 'Reason')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('original inválida')
    })

    it('should return error if original score is invalid (>100)', () => {
      const result = service.validateGradeOverride(150, 80, 'Reason')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('original inválida')
    })

    it('should return error if override score is invalid', () => {
      const result = service.validateGradeOverride(60, 150, 'Reason')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('override inválida')
    })

    it('should return error if scores are equal', () => {
      const result = service.validateGradeOverride(80, 80, 'Reason')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('diferente')
    })

    it('should return error if reason is empty', () => {
      const result = service.validateGradeOverride(60, 80, '')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('obrigatório')
    })

    it('should return error if reason is too short', () => {
      const result = service.validateGradeOverride(60, 80, 'Short')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('10 caracteres')
    })
  })

  describe('calculateStatistics', () => {
    it('should calculate statistics correctly', () => {
      const grades = [
        createGrade({ best_score: 60 }),
        createGrade({ best_score: 70 }),
        createGrade({ best_score: 80 }),
        createGrade({ best_score: 90 }),
        createGrade({ best_score: 80 }),
      ]

      const stats = service.calculateStatistics(grades)

      expect(stats).not.toBeNull()
      expect(stats!.mean).toBe(76.0)
      expect(stats!.median).toBe(80.0)
      expect(stats!.mode).toBe(80)
      expect(stats!.min).toBe(60)
      expect(stats!.max).toBe(90)
      expect(stats!.std_deviation).toBeGreaterThan(0)
    })

    it('should return null for empty grades', () => {
      expect(service.calculateStatistics([])).toBeNull()
    })

    it('should handle odd number of scores for median', () => {
      const grades = [
        createGrade({ best_score: 60 }),
        createGrade({ best_score: 70 }),
        createGrade({ best_score: 80 }),
      ]

      const stats = service.calculateStatistics(grades)

      expect(stats!.median).toBe(70.0)
    })

    it('should handle even number of scores for median', () => {
      const grades = [
        createGrade({ best_score: 60 }),
        createGrade({ best_score: 70 }),
        createGrade({ best_score: 80 }),
        createGrade({ best_score: 90 }),
      ]

      const stats = service.calculateStatistics(grades)

      expect(stats!.median).toBe(75.0)
    })
  })

  describe('getBestGrade', () => {
    it('should return grade with highest score', () => {
      const grades = [
        createGrade({ id: 'g1', best_score: 70 }),
        createGrade({ id: 'g2', best_score: 95 }),
        createGrade({ id: 'g3', best_score: 80 }),
      ]

      const result = service.getBestGrade(grades)

      expect(result?.id).toBe('g2')
      expect(result?.best_score).toBe(95)
    })

    it('should return null for empty grades', () => {
      expect(service.getBestGrade([])).toBeNull()
    })
  })

  describe('getWorstGrade', () => {
    it('should return grade with lowest score', () => {
      const grades = [
        createGrade({ id: 'g1', best_score: 70 }),
        createGrade({ id: 'g2', best_score: 45 }),
        createGrade({ id: 'g3', best_score: 80 }),
      ]

      const result = service.getWorstGrade(grades)

      expect(result?.id).toBe('g2')
      expect(result?.best_score).toBe(45)
    })

    it('should return null for empty grades', () => {
      expect(service.getWorstGrade([])).toBeNull()
    })
  })

  describe('filterByCourse', () => {
    it('should filter grades by course_id', () => {
      const grades = [
        createGrade({ course_id: 'course-1' }),
        createGrade({ course_id: 'course-2' }),
        createGrade({ course_id: 'course-1' }),
      ]

      const result = service.filterByCourse(grades, 'course-1')

      expect(result).toHaveLength(2)
      expect(result.every(g => g.course_id === 'course-1')).toBe(true)
    })
  })

  describe('filterBySubject', () => {
    it('should filter grades by subject_id', () => {
      const grades = [
        createGrade({ subject_id: 'subject-1' }),
        createGrade({ subject_id: 'subject-2' }),
        createGrade({ subject_id: 'subject-1' }),
      ]

      const result = service.filterBySubject(grades, 'subject-1')

      expect(result).toHaveLength(2)
      expect(result.every(g => g.subject_id === 'subject-1')).toBe(true)
    })
  })

  describe('filterPassingGrades', () => {
    it('should filter passing grades (>= 70)', () => {
      const grades = [
        createGrade({ best_score: 80 }),
        createGrade({ best_score: 60 }),
        createGrade({ best_score: 75 }),
      ]

      const result = service.filterPassingGrades(grades)

      expect(result).toHaveLength(2)
      expect(result.every(g => g.best_score >= 70)).toBe(true)
    })
  })

  describe('filterFailingGrades', () => {
    it('should filter failing grades (< 70)', () => {
      const grades = [
        createGrade({ best_score: 80 }),
        createGrade({ best_score: 60 }),
        createGrade({ best_score: 65 }),
      ]

      const result = service.filterFailingGrades(grades)

      expect(result).toHaveLength(2)
      expect(result.every(g => g.best_score < 70)).toBe(true)
    })
  })

  describe('sortByScore', () => {
    it('should sort by score descending by default', () => {
      const grades = [
        createGrade({ id: 'g1', best_score: 70 }),
        createGrade({ id: 'g2', best_score: 90 }),
        createGrade({ id: 'g3', best_score: 80 }),
      ]

      const result = service.sortByScore(grades)

      expect(result[0].best_score).toBe(90)
      expect(result[1].best_score).toBe(80)
      expect(result[2].best_score).toBe(70)
    })

    it('should sort by score ascending when specified', () => {
      const grades = [
        createGrade({ best_score: 70 }),
        createGrade({ best_score: 90 }),
        createGrade({ best_score: 80 }),
      ]

      const result = service.sortByScore(grades, true)

      expect(result[0].best_score).toBe(70)
      expect(result[1].best_score).toBe(80)
      expect(result[2].best_score).toBe(90)
    })
  })

  describe('sortByDate', () => {
    it('should sort by date descending by default', () => {
      const grades = [
        createGrade({ id: 'g1', last_attempt_date: '2024-01-10T00:00:00Z' }),
        createGrade({ id: 'g2', last_attempt_date: '2024-01-20T00:00:00Z' }),
        createGrade({ id: 'g3', last_attempt_date: '2024-01-15T00:00:00Z' }),
      ]

      const result = service.sortByDate(grades)

      expect(result[0].id).toBe('g2')
      expect(result[1].id).toBe('g3')
      expect(result[2].id).toBe('g1')
    })

    it('should sort by date ascending when specified', () => {
      const grades = [
        createGrade({ id: 'g1', last_attempt_date: '2024-01-15T00:00:00Z' }),
        createGrade({ id: 'g2', last_attempt_date: '2024-01-10T00:00:00Z' }),
        createGrade({ id: 'g3', last_attempt_date: '2024-01-20T00:00:00Z' }),
      ]

      const result = service.sortByDate(grades, true)

      expect(result[0].id).toBe('g2')
      expect(result[1].id).toBe('g1')
      expect(result[2].id).toBe('g3')
    })
  })

  describe('calculateCompletionPercentage', () => {
    it('should calculate completion percentage', () => {
      expect(service.calculateCompletionPercentage(3, 10)).toBe(30)
      expect(service.calculateCompletionPercentage(7, 10)).toBe(70)
      expect(service.calculateCompletionPercentage(10, 10)).toBe(100)
    })

    it('should return 0 if total is 0', () => {
      expect(service.calculateCompletionPercentage(0, 0)).toBe(0)
    })
  })

  describe('isImprovedByOverride', () => {
    it('should return true if override improved score', () => {
      const override = createOverride({ original_score: 60, override_score: 80 })

      expect(service.isImprovedByOverride(override)).toBe(true)
    })

    it('should return false if override decreased score', () => {
      const override = createOverride({ original_score: 80, override_score: 60 })

      expect(service.isImprovedByOverride(override)).toBe(false)
    })
  })

  describe('calculateOverrideDifference', () => {
    it('should calculate positive difference', () => {
      const override = createOverride({ original_score: 60, override_score: 85 })

      expect(service.calculateOverrideDifference(override)).toBe(25.0)
    })

    it('should calculate negative difference', () => {
      const override = createOverride({ original_score: 80, override_score: 65 })

      expect(service.calculateOverrideDifference(override)).toBe(-15.0)
    })
  })

  describe('formatScore', () => {
    it('should format score with comma separator', () => {
      expect(service.formatScore(85.5)).toBe('85,5')
      expect(service.formatScore(100)).toBe('100,0')
    })
  })

  describe('getScoreStatus', () => {
    it('should return Excelente for >= 90', () => {
      expect(service.getScoreStatus(95)).toBe('Excelente')
      expect(service.getScoreStatus(90)).toBe('Excelente')
    })

    it('should return Bom for >= passing grade', () => {
      expect(service.getScoreStatus(80, 70)).toBe('Bom')
      expect(service.getScoreStatus(70, 70)).toBe('Bom')
    })

    it('should return Regular for >= 50', () => {
      expect(service.getScoreStatus(60, 70)).toBe('Regular')
      expect(service.getScoreStatus(50, 70)).toBe('Regular')
    })

    it('should return Insuficiente for < 50', () => {
      expect(service.getScoreStatus(40)).toBe('Insuficiente')
      expect(service.getScoreStatus(0)).toBe('Insuficiente')
    })
  })

  describe('calculateRequiredScore', () => {
    it('should calculate required average for remaining tests', () => {
      const grades = [
        createGrade({ best_score: 60 }),
        createGrade({ best_score: 70 }),
      ]

      const result = service.calculateRequiredScore(grades, 5, 70)

      // Current sum: 130, Required total: 350, Remaining: 220 / 3 tests = 73.4
      expect(result).toBe(73.4)
    })

    it('should return null if all tests completed', () => {
      const grades = [
        createGrade({ best_score: 80 }),
        createGrade({ best_score: 75 }),
      ]

      const result = service.calculateRequiredScore(grades, 2, 70)

      expect(result).toBeNull()
    })

    it('should return null if impossible to pass', () => {
      const grades = [
        createGrade({ best_score: 30 }),
        createGrade({ best_score: 40 }),
      ]

      const result = service.calculateRequiredScore(grades, 3, 70)

      expect(result).toBeNull() // Would need > 100 in last test
    })

    it('should calculate required score even if currently above average', () => {
      const grades = [
        createGrade({ best_score: 90 }),
        createGrade({ best_score: 85 }),
      ]

      const result = service.calculateRequiredScore(grades, 3, 70)

      // Current sum: 175, Required total: 210, Remaining: 35 / 1 test = 35
      expect(result).toBe(35.0)
    })
  })

  describe('canStillPass', () => {
    it('should return true if possible to pass', () => {
      const grades = [
        createGrade({ best_score: 60 }),
        createGrade({ best_score: 70 }),
      ]

      expect(service.canStillPass(grades, 4, 70)).toBe(true)
    })

    it('should return false if impossible to pass', () => {
      const grades = [
        createGrade({ best_score: 30 }),
        createGrade({ best_score: 40 }),
      ]

      expect(service.canStillPass(grades, 3, 70)).toBe(false)
    })

    it('should return false if all tests completed', () => {
      const grades = [
        createGrade({ best_score: 60 }),
        createGrade({ best_score: 65 }),
      ]

      expect(service.canStillPass(grades, 2, 70)).toBe(false)
    })
  })
})

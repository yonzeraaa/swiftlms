import { describe, it, expect, beforeEach } from 'vitest'
import {
  StudentHistoryService,
  type StudentEnrollment,
  type CourseModule,
  type Lesson,
  type LessonProgress,
  type TestAttempt,
  type TCCSubmission,
} from '@/lib/services/StudentHistoryService'

describe('StudentHistoryService', () => {
  let service: StudentHistoryService

  beforeEach(() => {
    service = new StudentHistoryService()
  })

  const createEnrollment = (overrides?: Partial<StudentEnrollment>): StudentEnrollment => ({
    id: 'enroll-1',
    user_id: 'user-1',
    course_id: 'course-1',
    enrolled_at: '2024-01-01T00:00:00Z',
    progress_percentage: 50,
    status: 'active',
    ...overrides,
  })

  const createModule = (overrides?: Partial<CourseModule>): CourseModule => ({
    id: 'module-1',
    title: 'Módulo 1',
    total_hours: 40,
    order: 1,
    ...overrides,
  })

  const createLesson = (overrides?: Partial<Lesson>): Lesson => ({
    id: 'lesson-1',
    title: 'Lição 1',
    duration_minutes: 120,
    module_id: 'module-1',
    ...overrides,
  })

  const createLessonProgress = (overrides?: Partial<LessonProgress>): LessonProgress => ({
    id: 'progress-1',
    lesson_id: 'lesson-1',
    user_id: 'user-1',
    score: 8.5,
    completed_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    ...overrides,
  })

  const createTestAttempt = (overrides?: Partial<TestAttempt>): TestAttempt => ({
    id: 'attempt-1',
    user_id: 'user-1',
    test_id: 'test-1',
    score: 8.0,
    submitted_at: '2024-01-10T00:00:00Z',
    ...overrides,
  })

  const createTCCSubmission = (overrides?: Partial<TCCSubmission>): TCCSubmission => ({
    id: 'tcc-1',
    user_id: 'user-1',
    grade: 9.0,
    evaluated_at: '2024-02-01T00:00:00Z',
    ...overrides,
  })

  describe('calculateTestsAverage', () => {
    it('should calculate average of test scores', () => {
      const attempts = [
        createTestAttempt({ score: 8.0 }),
        createTestAttempt({ score: 9.0 }),
        createTestAttempt({ score: 7.0 }),
      ]

      expect(service.calculateTestsAverage(attempts)).toBe(8.0)
    })

    it('should return 0 for empty array', () => {
      expect(service.calculateTestsAverage([])).toBe(0)
    })

    it('should ignore scores of 0', () => {
      const attempts = [
        createTestAttempt({ score: 8.0 }),
        createTestAttempt({ score: 0 }),
        createTestAttempt({ score: 6.0 }),
      ]

      expect(service.calculateTestsAverage(attempts)).toBe(7.0)
    })

    it('should return 0 if all scores are 0', () => {
      const attempts = [
        createTestAttempt({ score: 0 }),
        createTestAttempt({ score: 0 }),
      ]

      expect(service.calculateTestsAverage(attempts)).toBe(0)
    })

    it('should round to 1 decimal place', () => {
      const attempts = [
        createTestAttempt({ score: 8.5 }),
        createTestAttempt({ score: 7.3 }),
      ]

      expect(service.calculateTestsAverage(attempts)).toBe(7.9)
    })
  })

  describe('calculateGeneralAverage', () => {
    it('should calculate weighted average (70% tests + 30% TCC)', () => {
      const result = service.calculateGeneralAverage(8.0, 9.0)

      expect(result).toBe(8.3) // 8.0 * 0.7 + 9.0 * 0.3 = 5.6 + 2.7 = 8.3
    })

    it('should handle 0 TCC grade', () => {
      const result = service.calculateGeneralAverage(8.0, 0)

      expect(result).toBe(5.6) // 8.0 * 0.7 + 0 * 0.3 = 5.6
    })

    it('should round to 1 decimal place', () => {
      const result = service.calculateGeneralAverage(7.7, 8.3)

      expect(result).toBe(7.9) // 7.7 * 0.7 + 8.3 * 0.3 = 5.39 + 2.49 = 7.88 ≈ 7.9
    })
  })

  describe('isApproved', () => {
    it('should return true for average >= 7.0', () => {
      expect(service.isApproved(7.0)).toBe(true)
      expect(service.isApproved(8.5)).toBe(true)
    })

    it('should return false for average < 7.0', () => {
      expect(service.isApproved(6.9)).toBe(false)
      expect(service.isApproved(5.0)).toBe(false)
    })

    it('should support custom passing grade', () => {
      expect(service.isApproved(8.0, 9.0)).toBe(false)
      expect(service.isApproved(9.5, 9.0)).toBe(true)
    })
  })

  describe('calculateModuleProgress', () => {
    it('should calculate module progress correctly', () => {
      const module = createModule()
      const lessons = [
        createLesson({ id: 'l1', module_id: 'module-1' }),
        createLesson({ id: 'l2', module_id: 'module-1' }),
      ]
      const progress = [
        createLessonProgress({ lesson_id: 'l1', score: 8.0, completed_at: '2024-01-10T00:00:00Z' }),
      ]

      const result = service.calculateModuleProgress(module, lessons, progress)

      expect(result.module_id).toBe('module-1')
      expect(result.completed_lessons).toBe(1)
      expect(result.total_lessons).toBe(2)
      expect(result.average_score).toBe(8.0)
    })

    it('should handle module with no completed lessons', () => {
      const module = createModule()
      const lessons = [createLesson({ module_id: 'module-1' })]
      const progress: LessonProgress[] = []

      const result = service.calculateModuleProgress(module, lessons, progress)

      expect(result.completed_lessons).toBe(0)
      expect(result.average_score).toBe(0)
    })

    it('should filter lessons by module_id', () => {
      const module = createModule({ id: 'module-1' })
      const lessons = [
        createLesson({ id: 'l1', module_id: 'module-1' }),
        createLesson({ id: 'l2', module_id: 'module-2' }),
      ]
      const progress = [
        createLessonProgress({ lesson_id: 'l1', completed_at: '2024-01-10T00:00:00Z' }),
        createLessonProgress({ lesson_id: 'l2', completed_at: '2024-01-10T00:00:00Z' }),
      ]

      const result = service.calculateModuleProgress(module, lessons, progress)

      expect(result.total_lessons).toBe(1)
      expect(result.completed_lessons).toBe(1)
    })

    it('should ignore scores of 0 when calculating average', () => {
      const module = createModule()
      const lessons = [
        createLesson({ id: 'l1', module_id: 'module-1' }),
        createLesson({ id: 'l2', module_id: 'module-1' }),
      ]
      const progress = [
        createLessonProgress({ lesson_id: 'l1', score: 8.0 }),
        createLessonProgress({ lesson_id: 'l2', score: 0 }),
      ]

      const result = service.calculateModuleProgress(module, lessons, progress)

      expect(result.average_score).toBe(8.0)
    })
  })

  describe('calculateTotalWorkload', () => {
    it('should sum module hours and lesson hours', () => {
      const modules = [
        createModule({ total_hours: 40 }),
        createModule({ total_hours: 30 }),
      ]
      const lessons = [
        createLesson({ duration_minutes: 120 }), // 2 hours
        createLesson({ duration_minutes: 180 }), // 3 hours
      ]

      const result = service.calculateTotalWorkload(modules, lessons)

      expect(result).toBe(75.0) // 40 + 30 + 2 + 3 = 75
    })

    it('should handle modules without total_hours', () => {
      const modules = [createModule({ total_hours: undefined })]
      const lessons = [createLesson({ duration_minutes: 60 })]

      const result = service.calculateTotalWorkload(modules, lessons)

      expect(result).toBe(1.0)
    })

    it('should handle lessons without duration_minutes', () => {
      const modules = [createModule({ total_hours: 10 })]
      const lessons = [createLesson({ duration_minutes: undefined })]

      const result = service.calculateTotalWorkload(modules, lessons)

      expect(result).toBe(10.0)
    })
  })

  describe('countCompletedLessons', () => {
    it('should count lessons with completed_at', () => {
      const lessons = [
        createLesson({ id: 'l1' }),
        createLesson({ id: 'l2' }),
        createLesson({ id: 'l3' }),
      ]
      const progress = [
        createLessonProgress({ lesson_id: 'l1', completed_at: '2024-01-10T00:00:00Z' }),
        createLessonProgress({ lesson_id: 'l2', completed_at: undefined }),
      ]

      const result = service.countCompletedLessons(lessons, progress)

      expect(result).toBe(1)
    })

    it('should return 0 if no progress', () => {
      const lessons = [createLesson()]
      const progress: LessonProgress[] = []

      const result = service.countCompletedLessons(lessons, progress)

      expect(result).toBe(0)
    })
  })

  describe('formatEnrollmentStatus', () => {
    it('should format status to Portuguese', () => {
      expect(service.formatEnrollmentStatus('active')).toBe('Em andamento')
      expect(service.formatEnrollmentStatus('completed')).toBe('Concluído')
      expect(service.formatEnrollmentStatus('dropped')).toBe('Cancelado')
    })

    it('should return original status if not mapped', () => {
      expect(service.formatEnrollmentStatus('unknown' as any)).toBe('unknown')
    })
  })

  describe('generateHistorySummary', () => {
    it('should generate complete history summary', () => {
      const enrollment = createEnrollment({ progress_percentage: 75 })
      const modules = [createModule({ total_hours: 40 })]
      const lessons = [
        createLesson({ id: 'l1', duration_minutes: 120 }),
        createLesson({ id: 'l2', duration_minutes: 120 }),
      ]
      const progress = [
        createLessonProgress({ lesson_id: 'l1', score: 8.0, completed_at: '2024-01-10T00:00:00Z' }),
      ]
      const testAttempts = [createTestAttempt({ score: 8.0 })]
      const tccSubmission = createTCCSubmission({ grade: 9.0 })

      const result = service.generateHistorySummary(
        'João Silva',
        'Curso de Teste',
        enrollment,
        modules,
        lessons,
        progress,
        testAttempts,
        tccSubmission
      )

      expect(result.student_name).toBe('João Silva')
      expect(result.course_name).toBe('Curso de Teste')
      expect(result.progress_percentage).toBe(75)
      expect(result.tests_average).toBe(8.0)
      expect(result.tcc_grade).toBe(9.0)
      expect(result.general_average).toBe(8.3)
      expect(result.completed_lessons).toBe(1)
      expect(result.total_lessons).toBe(2)
      expect(result.is_approved).toBe(true)
    })

    it('should handle missing TCC submission', () => {
      const enrollment = createEnrollment()
      const result = service.generateHistorySummary(
        'João Silva',
        'Curso',
        enrollment,
        [],
        [],
        [],
        []
      )

      expect(result.tcc_grade).toBe(0)
    })
  })

  describe('validateHistoryData', () => {
    it('should validate correct enrollment data', () => {
      const enrollment = createEnrollment()
      const result = service.validateHistoryData(enrollment)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return error if user_id is missing', () => {
      const enrollment = createEnrollment({ user_id: '' })
      const result = service.validateHistoryData(enrollment)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('user_id')
    })

    it('should return error if course_id is missing', () => {
      const enrollment = createEnrollment({ course_id: '' })
      const result = service.validateHistoryData(enrollment)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('course_id')
    })

    it('should return error if enrolled_at is missing', () => {
      const enrollment = createEnrollment({ enrolled_at: '' })
      const result = service.validateHistoryData(enrollment)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('matrícula ausente')
    })

    it('should return error if progress is invalid (<0)', () => {
      const enrollment = createEnrollment({ progress_percentage: -10 })
      const result = service.validateHistoryData(enrollment)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('inválida')
    })

    it('should return error if progress is invalid (>100)', () => {
      const enrollment = createEnrollment({ progress_percentage: 150 })
      const result = service.validateHistoryData(enrollment)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('inválida')
    })
  })

  describe('formatGrade', () => {
    it('should format grade with 1 decimal and comma', () => {
      expect(service.formatGrade(8.5)).toBe('8,5')
      expect(service.formatGrade(10)).toBe('10,0')
      expect(service.formatGrade(7.25)).toBe('7,3')
    })
  })

  describe('getLatestLessonProgress', () => {
    it('should return latest progress by updated_at', () => {
      const progress = [
        createLessonProgress({
          id: 'p1',
          lesson_id: 'lesson-1',
          updated_at: '2024-01-10T00:00:00Z',
        }),
        createLessonProgress({
          id: 'p2',
          lesson_id: 'lesson-1',
          updated_at: '2024-01-15T00:00:00Z',
        }),
      ]

      const result = service.getLatestLessonProgress('lesson-1', progress)

      expect(result?.id).toBe('p2')
    })

    it('should return null if no progress for lesson', () => {
      const progress = [createLessonProgress({ lesson_id: 'lesson-1' })]

      const result = service.getLatestLessonProgress('lesson-2', progress)

      expect(result).toBeNull()
    })

    it('should return null for empty array', () => {
      const result = service.getLatestLessonProgress('lesson-1', [])

      expect(result).toBeNull()
    })
  })

  describe('calculateDaysBetween', () => {
    it('should calculate days between two dates', () => {
      const result = service.calculateDaysBetween('2024-01-01', '2024-01-10')

      expect(result).toBe(9)
    })

    it('should handle same date', () => {
      const result = service.calculateDaysBetween('2024-01-01', '2024-01-01')

      expect(result).toBe(0)
    })

    it('should handle reverse order (absolute difference)', () => {
      const result = service.calculateDaysBetween('2024-01-10', '2024-01-01')

      expect(result).toBe(9)
    })
  })

  describe('getLatestTestAttempt', () => {
    it('should return latest attempt by submitted_at', () => {
      const attempts = [
        createTestAttempt({
          id: 'a1',
          test_id: 'test-1',
          submitted_at: '2024-01-10T00:00:00Z',
        }),
        createTestAttempt({
          id: 'a2',
          test_id: 'test-1',
          submitted_at: '2024-01-15T00:00:00Z',
        }),
      ]

      const result = service.getLatestTestAttempt('test-1', attempts)

      expect(result?.id).toBe('a2')
    })

    it('should return null if no attempts for test', () => {
      const attempts = [createTestAttempt({ test_id: 'test-1' })]

      const result = service.getLatestTestAttempt('test-2', attempts)

      expect(result).toBeNull()
    })

    it('should return null for empty array', () => {
      const result = service.getLatestTestAttempt('test-1', [])

      expect(result).toBeNull()
    })
  })
})

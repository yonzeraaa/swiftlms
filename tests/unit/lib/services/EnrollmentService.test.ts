import { describe, it, expect, beforeEach } from 'vitest'
import {
  EnrollmentService,
  type Enrollment,
  type Course,
  type Module,
} from '@/lib/services/EnrollmentService'

describe('EnrollmentService', () => {
  let service: EnrollmentService

  beforeEach(() => {
    service = new EnrollmentService()
  })

  const createMockCourse = (overrides?: Partial<Course>): Course => ({
    id: 'course-1',
    title: 'Test Course',
    status: 'active',
    ...overrides,
  })

  const createMockEnrollment = (overrides?: Partial<Enrollment>): Enrollment => ({
    id: 'enroll-1',
    student_id: 'student-1',
    course_id: 'course-1',
    progress: 0,
    status: 'active',
    enrolled_at: new Date().toISOString(),
    ...overrides,
  })

  describe('canEnroll', () => {
    it('should return true if student is eligible', () => {
      const course = createMockCourse()
      expect(service.canEnroll('student-1', course)).toBe(true)
    })

    it('should return false if already enrolled (active)', () => {
      const course = createMockCourse()
      const enrollment = createMockEnrollment({ status: 'active' })

      expect(service.canEnroll('student-1', course, enrollment)).toBe(false)
    })

    it('should return false if course is inactive', () => {
      const course = createMockCourse({ status: 'inactive' })

      expect(service.canEnroll('student-1', course)).toBe(false)
    })

    it('should return true if previous enrollment was completed', () => {
      const course = createMockCourse()
      const enrollment = createMockEnrollment({ status: 'completed', progress: 100 })

      expect(service.canEnroll('student-1', course, enrollment)).toBe(true)
    })
  })

  describe('calculateProgress', () => {
    it('should return correct percentage (50% for 5/10)', () => {
      expect(service.calculateProgress(5, 10)).toBe(50)
    })

    it('should return 0% if no modules completed', () => {
      expect(service.calculateProgress(0, 10)).toBe(0)
    })

    it('should return 100% if all modules completed', () => {
      expect(service.calculateProgress(10, 10)).toBe(100)
    })

    it('should return 0% if totalModules is 0', () => {
      expect(service.calculateProgress(0, 0)).toBe(0)
    })

    it('should round to nearest integer', () => {
      expect(service.calculateProgress(1, 3)).toBe(33) // 33.33...
    })
  })

  describe('getEnrollmentStatus', () => {
    it('should return "completed" if status is completed and progress is 100%', () => {
      const enrollment = createMockEnrollment({ status: 'completed', progress: 100 })
      expect(service.getEnrollmentStatus(enrollment)).toBe('completed')
    })

    it('should return "active" if progress < 100%', () => {
      const enrollment = createMockEnrollment({ status: 'active', progress: 50 })
      expect(service.getEnrollmentStatus(enrollment)).toBe('active')
    })

    it('should return "failed" if status is dropped', () => {
      const enrollment = createMockEnrollment({ status: 'dropped' })
      expect(service.getEnrollmentStatus(enrollment)).toBe('failed')
    })
  })

  describe('getNextModuleToComplete', () => {
    it('should return first uncompleted module', () => {
      const modules: Module[] = [
        { id: 'm1', course_id: 'c1', order: 1, is_completed: true },
        { id: 'm2', course_id: 'c1', order: 2, is_completed: false },
        { id: 'm3', course_id: 'c1', order: 3, is_completed: false },
      ]

      const result = service.getNextModuleToComplete(modules)

      expect(result?.id).toBe('m2')
    })

    it('should return null if all modules completed', () => {
      const modules: Module[] = [
        { id: 'm1', course_id: 'c1', order: 1, is_completed: true },
        { id: 'm2', course_id: 'c1', order: 2, is_completed: true },
      ]

      const result = service.getNextModuleToComplete(modules)

      expect(result).toBeNull()
    })

    it('should handle unordered modules correctly', () => {
      const modules: Module[] = [
        { id: 'm3', course_id: 'c1', order: 3, is_completed: false },
        { id: 'm1', course_id: 'c1', order: 1, is_completed: true },
        { id: 'm2', course_id: 'c1', order: 2, is_completed: false },
      ]

      const result = service.getNextModuleToComplete(modules)

      expect(result?.order).toBe(2)
    })
  })

  describe('shouldCompleteEnrollment', () => {
    it('should return false if progress < 100%', () => {
      expect(service.shouldCompleteEnrollment(99)).toBe(false)
    })

    it('should return true if progress is 100% and no passing grade required', () => {
      expect(service.shouldCompleteEnrollment(100)).toBe(true)
    })

    it('should return true if progress is 100% and passing grade >= 7.0', () => {
      expect(service.shouldCompleteEnrollment(100, 8.0)).toBe(true)
    })

    it('should return false if progress is 100% but passing grade < 7.0', () => {
      expect(service.shouldCompleteEnrollment(100, 6.0)).toBe(false)
    })
  })

  describe('validateEnrollment', () => {
    it('should return valid=true for valid data', () => {
      const result = service.validateEnrollment('student-1', 'course-1')

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return error if student_id is missing', () => {
      const result = service.validateEnrollment('', 'course-1')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('obrigatórios')
    })

    it('should return error if course_id is missing', () => {
      const result = service.validateEnrollment('student-1', '')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('obrigatórios')
    })
  })
})

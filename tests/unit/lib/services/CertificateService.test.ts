import { describe, it, expect, beforeEach } from 'vitest'
import {
  CertificateService,
  type Enrollment,
  type Course,
} from '@/lib/services/CertificateService'

describe('CertificateService', () => {
  let service: CertificateService

  beforeEach(() => {
    service = new CertificateService()
  })

  const createMockEnrollment = (overrides?: Partial<Enrollment>): Enrollment => ({
    id: 'enroll-1',
    student_id: 'student-1',
    course_id: 'course-1',
    progress: 100,
    status: 'completed',
    completed_at: '2024-01-15T10:00:00Z',
    ...overrides,
  })

  const createMockCourse = (overrides?: Partial<Course>): Course => ({
    id: 'course-1',
    title: 'Introdução à Programação',
    duration_hours: 40,
    ...overrides,
  })

  describe('canRequestCertificate', () => {
    it('should return true for 100% completed enrollment', () => {
      const enrollment = createMockEnrollment()
      expect(service.canRequestCertificate(enrollment)).toBe(true)
    })

    it('should return false if progress < 100%', () => {
      const enrollment = createMockEnrollment({ progress: 99 })
      expect(service.canRequestCertificate(enrollment)).toBe(false)
    })

    it('should return false if status is not completed', () => {
      const enrollment = createMockEnrollment({ status: 'active' })
      expect(service.canRequestCertificate(enrollment)).toBe(false)
    })

    it('should return false if status is dropped', () => {
      const enrollment = createMockEnrollment({ status: 'dropped', progress: 100 })
      expect(service.canRequestCertificate(enrollment)).toBe(false)
    })
  })

  describe('generateCertificateData', () => {
    it('should format certificate data correctly', () => {
      const enrollment = createMockEnrollment()
      const course = createMockCourse()

      const result = service.generateCertificateData(enrollment, course, 'João Silva')

      expect(result.studentName).toBe('João Silva')
      expect(result.courseName).toBe('Introdução à Programação')
      expect(result.completionDate).toContain('janeiro')
      expect(result.completionDate).toContain('2024')
      expect(result.courseHours).toContain('40')
    })

    it('should handle course without duration_hours', () => {
      const enrollment = createMockEnrollment()
      const course = createMockCourse({ duration_hours: undefined })

      const result = service.generateCertificateData(enrollment, course, 'João Silva')

      expect(result.courseHours).toBe('0 horas')
    })
  })

  describe('formatCourseHours', () => {
    it('should format 1 hour correctly', () => {
      expect(service.formatCourseHours(1)).toBe('1 hora')
    })

    it('should format multiple hours correctly', () => {
      expect(service.formatCourseHours(40)).toBe('40 horas')
    })

    it('should handle 0 hours', () => {
      expect(service.formatCourseHours(0)).toBe('0 horas')
    })

    it('should handle 2 hours', () => {
      expect(service.formatCourseHours(2)).toBe('2 horas')
    })
  })

  describe('formatCompletionDate', () => {
    it('should format ISO date to Portuguese long format', () => {
      const result = service.formatCompletionDate('2024-01-15T10:00:00Z')

      expect(result).toContain('15')
      expect(result).toContain('janeiro')
      expect(result).toContain('2024')
    })
  })

  describe('validateCertificateRequest', () => {
    it('should return valid=true for eligible enrollment', () => {
      const enrollment = createMockEnrollment()
      const result = service.validateCertificateRequest(enrollment)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return error if progress < 100%', () => {
      const enrollment = createMockEnrollment({ progress: 80 })
      const result = service.validateCertificateRequest(enrollment)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Curso não concluído')
      expect(result.error).toContain('80%')
    })

    it('should return error if status is not completed', () => {
      const enrollment = createMockEnrollment({ status: 'active' })
      const result = service.validateCertificateRequest(enrollment)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Status')
      expect(result.error).toContain('active')
    })
  })
})

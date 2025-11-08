import { describe, it, expect } from 'vitest'
import {
  mapEnrollmentsDataForTemplate,
  type EnrollmentsReportData,
  type EnrollmentRowData,
} from '@/lib/excel-template-mappers/enrollments-mapper'

describe('enrollments-mapper', () => {
  describe('mapEnrollmentsDataForTemplate', () => {
    it('should map enrollments data correctly', () => {
      const data: EnrollmentsReportData = {
        institution: 'IPETEC',
        period_start: '01/01/2024',
        period_end: '31/01/2024',
        enrollments: [
          {
            student_name: 'John Doe',
            email: 'john@example.com',
            course: 'JavaScript Básico',
            enrolled_at: '15/01/2024',
            status: 'Ativo',
            progress_percentage: 75.5,
            lessons_completed: 15,
            lessons_total: 20,
            completed_at: '-',
            certificate_id: '-',
          },
        ],
      }

      const result = mapEnrollmentsDataForTemplate(data)

      expect(result.institution).toBe('IPETEC')
      expect(result.period_start).toBe('01/01/2024')
      expect(result.period_end).toBe('31/01/2024')
      expect(result.enrollments).toHaveLength(1)
      expect(result.enrollments[0].student_name).toBe('John Doe')
    })

    it('should preserve all enrollment fields', () => {
      const enrollment: EnrollmentRowData = {
        student_name: 'Jane Smith',
        email: 'jane@example.com',
        course: 'Python Advanced',
        enrolled_at: '20/01/2024',
        status: 'Concluído',
        progress_percentage: 100,
        lessons_completed: 30,
        lessons_total: 30,
        completed_at: '31/01/2024',
        certificate_id: 'CERT-2024-001',
      }

      const data: EnrollmentsReportData = {
        institution: 'Test Institution',
        period_start: '01/01/2024',
        period_end: '31/01/2024',
        enrollments: [enrollment],
      }

      const result = mapEnrollmentsDataForTemplate(data)

      expect(result.enrollments[0]).toEqual(enrollment)
    })

    it('should handle multiple enrollments', () => {
      const data: EnrollmentsReportData = {
        institution: 'IPETEC',
        period_start: '01/01/2024',
        period_end: '31/01/2024',
        enrollments: [
          {
            student_name: 'Student 1',
            email: 's1@example.com',
            course: 'Course 1',
            enrolled_at: '10/01/2024',
            status: 'Ativo',
            progress_percentage: 50,
            lessons_completed: 10,
            lessons_total: 20,
            completed_at: '-',
            certificate_id: '-',
          },
          {
            student_name: 'Student 2',
            email: 's2@example.com',
            course: 'Course 2',
            enrolled_at: '15/01/2024',
            status: 'Concluído',
            progress_percentage: 100,
            lessons_completed: 25,
            lessons_total: 25,
            completed_at: '30/01/2024',
            certificate_id: 'CERT-123',
          },
        ],
      }

      const result = mapEnrollmentsDataForTemplate(data)

      expect(result.enrollments).toHaveLength(2)
      expect(result.enrollments[0].student_name).toBe('Student 1')
      expect(result.enrollments[1].student_name).toBe('Student 2')
    })

    it('should handle empty enrollments array', () => {
      const data: EnrollmentsReportData = {
        institution: 'IPETEC',
        period_start: '01/01/2024',
        period_end: '31/01/2024',
        enrollments: [],
      }

      const result = mapEnrollmentsDataForTemplate(data)

      expect(result.enrollments).toEqual([])
      expect(result.institution).toBe('IPETEC')
    })

    it('should preserve data structure', () => {
      const data: EnrollmentsReportData = {
        institution: 'IPETEC',
        period_start: '01/01/2024',
        period_end: '31/01/2024',
        enrollments: [],
      }

      const result = mapEnrollmentsDataForTemplate(data)

      expect(Object.keys(result)).toEqual(['institution', 'period_start', 'period_end', 'enrollments'])
    })
  })
})

import { describe, it, expect } from 'vitest'
import {
  mapGradesDataForTemplate,
  type GradesReportData,
  type GradeRowData,
} from '@/lib/excel-template-mappers/grades-mapper'

describe('grades-mapper', () => {
  describe('mapGradesDataForTemplate', () => {
    it('should map grades data correctly', () => {
      const data: GradesReportData = {
        institution: 'IPETEC',
        report_date: '08/11/2024',
        grades: [
          {
            student_name: 'John Doe',
            email: 'john@example.com',
            course: 'JavaScript Básico',
            subject: 'Variáveis',
            test_title: 'Teste 1',
            score: 85,
            max_score: 100,
            percentage: 85,
            attempt_date: '05/11/2024 14:30',
            status: 'Realizado',
          },
        ],
      }

      const result = mapGradesDataForTemplate(data)

      expect(result.institution).toBe('IPETEC')
      expect(result.report_date).toBe('08/11/2024')
      expect(result.grades).toHaveLength(1)
      expect(result.grades[0].student_name).toBe('John Doe')
      expect(result.grades[0].score).toBe(85)
    })

    it('should preserve all grade fields', () => {
      const grade: GradeRowData = {
        student_name: 'Jane Smith',
        email: 'jane@example.com',
        course: 'Python Advanced',
        subject: 'Loops',
        test_title: 'Quiz Final',
        score: 95.5,
        max_score: 100,
        percentage: 95.5,
        attempt_date: '01/11/2024 10:00',
        status: 'Realizado',
      }

      const data: GradesReportData = {
        institution: 'Test Institution',
        report_date: '08/11/2024',
        grades: [grade],
      }

      const result = mapGradesDataForTemplate(data)

      expect(result.grades[0]).toEqual(grade)
    })

    it('should handle multiple grades', () => {
      const data: GradesReportData = {
        institution: 'IPETEC',
        report_date: '08/11/2024',
        grades: [
          {
            student_name: 'Student 1',
            email: 's1@example.com',
            course: 'Course 1',
            subject: 'Subject 1',
            test_title: 'Test 1',
            score: 70,
            max_score: 100,
            percentage: 70,
            attempt_date: '01/11/2024 14:00',
            status: 'Realizado',
          },
          {
            student_name: 'Student 2',
            email: 's2@example.com',
            course: 'Course 2',
            subject: 'Subject 2',
            test_title: 'Test 2',
            score: 90,
            max_score: 100,
            percentage: 90,
            attempt_date: '02/11/2024 15:00',
            status: 'Realizado',
          },
        ],
      }

      const result = mapGradesDataForTemplate(data)

      expect(result.grades).toHaveLength(2)
      expect(result.grades[0].score).toBe(70)
      expect(result.grades[1].score).toBe(90)
    })

    it('should handle empty grades array', () => {
      const data: GradesReportData = {
        institution: 'IPETEC',
        report_date: '08/11/2024',
        grades: [],
      }

      const result = mapGradesDataForTemplate(data)

      expect(result.grades).toEqual([])
      expect(result.institution).toBe('IPETEC')
      expect(result.report_date).toBe('08/11/2024')
    })

    it('should handle decimal scores', () => {
      const data: GradesReportData = {
        institution: 'IPETEC',
        report_date: '08/11/2024',
        grades: [
          {
            student_name: 'John Doe',
            email: 'john@example.com',
            course: 'Math',
            subject: 'Algebra',
            test_title: 'Test 1',
            score: 87.3,
            max_score: 100,
            percentage: 87.3,
            attempt_date: '05/11/2024 14:30',
            status: 'Realizado',
          },
        ],
      }

      const result = mapGradesDataForTemplate(data)

      expect(result.grades[0].score).toBe(87.3)
      expect(result.grades[0].percentage).toBe(87.3)
    })

    it('should preserve data structure', () => {
      const data: GradesReportData = {
        institution: 'IPETEC',
        report_date: '08/11/2024',
        grades: [],
      }

      const result = mapGradesDataForTemplate(data)

      expect(Object.keys(result)).toEqual(['institution', 'report_date', 'grades'])
    })

    it('should handle different status values', () => {
      const data: GradesReportData = {
        institution: 'IPETEC',
        report_date: '08/11/2024',
        grades: [
          {
            student_name: 'Student 1',
            email: 's1@example.com',
            course: 'Course',
            subject: 'Subject',
            test_title: 'Test',
            score: 80,
            max_score: 100,
            percentage: 80,
            attempt_date: '05/11/2024 14:30',
            status: 'Realizado',
          },
          {
            student_name: 'Student 2',
            email: 's2@example.com',
            course: 'Course',
            subject: 'Subject',
            test_title: 'Test',
            score: 0,
            max_score: 100,
            percentage: 0,
            attempt_date: '-',
            status: 'Não Realizado',
          },
        ],
      }

      const result = mapGradesDataForTemplate(data)

      expect(result.grades[0].status).toBe('Realizado')
      expect(result.grades[1].status).toBe('Não Realizado')
    })
  })
})

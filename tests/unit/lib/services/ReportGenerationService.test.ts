import { describe, it, expect, beforeEach } from 'vitest'
import {
  ReportGenerationService,
  type ReportFilter,
} from '@/lib/services/ReportGenerationService'

describe('ReportGenerationService', () => {
  let service: ReportGenerationService

  beforeEach(() => {
    service = new ReportGenerationService()
  })

  describe('validateFilters', () => {
    it('should validate correct filters', () => {
      const filters: ReportFilter = {
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      }

      const result = service.validateFilters(filters)

      expect(result.valid).toBe(true)
    })

    it('should return error if start_date > end_date', () => {
      const filters: ReportFilter = {
        start_date: '2024-12-31',
        end_date: '2024-01-01',
      }

      const result = service.validateFilters(filters)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Data inicial')
    })

    it('should accept filters without dates', () => {
      const filters: ReportFilter = {
        course_id: 'course-1',
      }

      const result = service.validateFilters(filters)

      expect(result.valid).toBe(true)
    })
  })

  describe('calculatePassingRate', () => {
    it('should calculate passing rate correctly', () => {
      expect(service.calculatePassingRate(7, 10)).toBe(70.0)
      expect(service.calculatePassingRate(10, 10)).toBe(100.0)
      expect(service.calculatePassingRate(0, 10)).toBe(0)
    })

    it('should return 0 if totalCount is 0', () => {
      expect(service.calculatePassingRate(0, 0)).toBe(0)
    })

    it('should round to 1 decimal place', () => {
      expect(service.calculatePassingRate(2, 3)).toBe(66.7)
    })
  })

  describe('generateEnrollmentSummary', () => {
    it('should generate enrollment summary', () => {
      const enrollments = [
        { status: 'active', progress_percentage: 50 },
        { status: 'active', progress_percentage: 75 },
        { status: 'completed', progress_percentage: 100 },
        { status: 'dropped', progress_percentage: 25 },
      ]

      const result = service.generateEnrollmentSummary('course-1', 'Test Course', enrollments)

      expect(result.course_id).toBe('course-1')
      expect(result.course_name).toBe('Test Course')
      expect(result.total_enrollments).toBe(4)
      expect(result.active_enrollments).toBe(2)
      expect(result.completed_enrollments).toBe(1)
      expect(result.dropped_enrollments).toBe(1)
      expect(result.average_progress).toBe(62.5)
    })

    it('should handle empty enrollments', () => {
      const result = service.generateEnrollmentSummary('course-1', 'Test', [])

      expect(result.total_enrollments).toBe(0)
      expect(result.average_progress).toBe(0)
    })
  })

  describe('generateGradesReport', () => {
    it('should generate grades report', () => {
      const grades = [
        { best_score: 80 },
        { best_score: 90 },
        { best_score: 60 },
        { best_score: 75 },
      ]

      const result = service.generateGradesReport('course-1', grades, 70)

      expect(result.course_id).toBe('course-1')
      expect(result.total_students).toBe(4)
      expect(result.average_score).toBe(76.3)
      expect(result.passing_rate).toBe(75.0) // 3 out of 4
      expect(result.failing_rate).toBe(25.0)
      expect(result.highest_score).toBe(90)
      expect(result.lowest_score).toBe(60)
    })

    it('should handle empty grades', () => {
      const result = service.generateGradesReport('course-1', [], 70)

      expect(result.total_students).toBe(0)
      expect(result.average_score).toBe(0)
      expect(result.highest_score).toBe(0)
      expect(result.lowest_score).toBe(0)
    })
  })

  describe('formatDateRange', () => {
    it('should format date range in pt-BR', () => {
      const result = service.formatDateRange('2024-01-15T12:00:00Z', '2024-12-31T12:00:00Z')

      expect(result).toContain('2024')
      expect(result).toContain(' - ')
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    })
  })

  describe('groupByPeriod', () => {
    it('should group by day', () => {
      const data = [
        { created_at: '2024-01-15T10:00:00Z' },
        { created_at: '2024-01-15T15:00:00Z' },
        { created_at: '2024-01-16T10:00:00Z' },
      ]

      const result = service.groupByPeriod(data, 'day')

      expect(result['2024-01-15']).toBe(2)
      expect(result['2024-01-16']).toBe(1)
    })

    it('should group by month', () => {
      const data = [
        { created_at: '2024-01-15T10:00:00Z' },
        { created_at: '2024-01-20T10:00:00Z' },
        { created_at: '2024-02-10T10:00:00Z' },
      ]

      const result = service.groupByPeriod(data, 'month')

      expect(result['2024-01']).toBe(2)
      expect(result['2024-02']).toBe(1)
    })

    it('should group by week', () => {
      const data = [
        { created_at: '2024-01-15T10:00:00Z' },
        { created_at: '2024-01-16T10:00:00Z' },
      ]

      const result = service.groupByPeriod(data, 'week')

      const keys = Object.keys(result)
      expect(keys.length).toBeGreaterThan(0)
      expect(keys[0]).toMatch(/^\d{4}-W\d+$/)
    })
  })

  describe('exportToCSV', () => {
    it('should export data to CSV format', () => {
      const headers = ['Nome', 'Nota', 'Status']
      const rows = [
        ['João Silva', '85', 'Aprovado'],
        ['Maria Santos', '65', 'Reprovado'],
      ]

      const result = service.exportToCSV(headers, rows)

      expect(result).toContain('Nome,Nota,Status')
      expect(result).toContain('João Silva,85,Aprovado')
      expect(result).toContain('Maria Santos,65,Reprovado')
      expect(result.split('\n')).toHaveLength(3)
    })

    it('should handle empty rows', () => {
      const headers = ['Col1', 'Col2']
      const rows: string[][] = []

      const result = service.exportToCSV(headers, rows)

      expect(result).toBe('Col1,Col2')
    })
  })

  describe('isValidReportType', () => {
    it('should validate correct report types', () => {
      expect(service.isValidReportType('enrollment')).toBe(true)
      expect(service.isValidReportType('completion')).toBe(true)
      expect(service.isValidReportType('grades')).toBe(true)
      expect(service.isValidReportType('activity')).toBe(true)
      expect(service.isValidReportType('certificate')).toBe(true)
    })

    it('should return false for invalid types', () => {
      expect(service.isValidReportType('invalid')).toBe(false)
      expect(service.isValidReportType('')).toBe(false)
    })
  })
})

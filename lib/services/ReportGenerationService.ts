export type ReportType = 'enrollment' | 'completion' | 'grades' | 'activity' | 'certificate'

export interface ReportFilter {
  course_id?: string
  start_date?: string
  end_date?: string
  user_id?: string
  status?: string
}

export interface EnrollmentReport {
  course_id: string
  course_name: string
  total_enrollments: number
  active_enrollments: number
  completed_enrollments: number
  dropped_enrollments: number
  average_progress: number
}

export interface GradesReport {
  course_id: string
  total_students: number
  average_score: number
  passing_rate: number
  failing_rate: number
  highest_score: number
  lowest_score: number
}

export interface ActivityReport {
  period: string
  total_activities: number
  unique_users: number
  most_active_day: string
  activity_breakdown: Record<string, number>
}

export class ReportGenerationService {
  /**
   * Valida filtros de relatório
   */
  validateFilters(filters: ReportFilter): { valid: boolean; error?: string } {
    if (filters.start_date && filters.end_date) {
      const start = new Date(filters.start_date)
      const end = new Date(filters.end_date)

      if (start > end) {
        return {
          valid: false,
          error: 'Data inicial não pode ser posterior à data final',
        }
      }
    }

    return { valid: true }
  }

  /**
   * Calcula taxa de aprovação
   */
  calculatePassingRate(passedCount: number, totalCount: number): number {
    if (totalCount === 0) {
      return 0
    }

    return Math.round((passedCount / totalCount) * 100 * 10) / 10
  }

  /**
   * Gera sumário de matrículas
   */
  generateEnrollmentSummary(
    courseId: string,
    courseName: string,
    enrollments: Array<{ status: string; progress_percentage: number }>
  ): EnrollmentReport {
    const total = enrollments.length
    const active = enrollments.filter(e => e.status === 'active').length
    const completed = enrollments.filter(e => e.status === 'completed').length
    const dropped = enrollments.filter(e => e.status === 'dropped').length

    const avgProgress =
      total > 0
        ? Math.round(
            (enrollments.reduce((sum, e) => sum + e.progress_percentage, 0) / total) * 10
          ) / 10
        : 0

    return {
      course_id: courseId,
      course_name: courseName,
      total_enrollments: total,
      active_enrollments: active,
      completed_enrollments: completed,
      dropped_enrollments: dropped,
      average_progress: avgProgress,
    }
  }

  /**
   * Gera relatório de notas
   */
  generateGradesReport(
    courseId: string,
    grades: Array<{ best_score: number }>,
    passingGrade: number = 70
  ): GradesReport {
    const total = grades.length
    const scores = grades.map(g => g.best_score)

    const passedCount = scores.filter(s => s >= passingGrade).length
    const average = total > 0 ? scores.reduce((sum, s) => sum + s, 0) / total : 0

    return {
      course_id: courseId,
      total_students: total,
      average_score: Math.round(average * 10) / 10,
      passing_rate: this.calculatePassingRate(passedCount, total),
      failing_rate: this.calculatePassingRate(total - passedCount, total),
      highest_score: scores.length > 0 ? Math.max(...scores) : 0,
      lowest_score: scores.length > 0 ? Math.min(...scores) : 0,
    }
  }

  /**
   * Formata período de datas
   */
  formatDateRange(startDate: string, endDate: string): string {
    const start = new Date(startDate).toLocaleDateString('pt-BR')
    const end = new Date(endDate).toLocaleDateString('pt-BR')
    return `${start} - ${end}`
  }

  /**
   * Agrupa dados por período (dia/semana/mês)
   */
  groupByPeriod(
    data: Array<{ created_at: string }>,
    period: 'day' | 'week' | 'month'
  ): Record<string, number> {
    const grouped: Record<string, number> = {}

    data.forEach(item => {
      const date = new Date(item.created_at)
      let key: string

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0]
          break
        case 'week':
          const weekNum = this.getWeekNumber(date)
          key = `${date.getFullYear()}-W${weekNum}`
          break
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
      }

      grouped[key] = (grouped[key] || 0) + 1
    })

    return grouped
  }

  /**
   * Obtém número da semana do ano
   */
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  /**
   * Exporta relatório como CSV
   */
  exportToCSV(headers: string[], rows: string[][]): string {
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')

    return csvContent
  }

  /**
   * Valida tipo de relatório
   */
  isValidReportType(type: string): type is ReportType {
    const validTypes: ReportType[] = ['enrollment', 'completion', 'grades', 'activity', 'certificate']
    return validTypes.includes(type as ReportType)
  }
}

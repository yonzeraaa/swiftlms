export type ActivityType =
  | 'login'
  | 'logout'
  | 'course_view'
  | 'lesson_start'
  | 'lesson_complete'
  | 'test_submit'
  | 'enrollment_create'
  | 'certificate_request'
  | 'grade_override'
  | 'user_create'
  | 'user_update'
  | 'user_delete'
  | 'course_create'
  | 'course_update'
  | 'course_delete'

export interface ActivityLog {
  id: string
  user_id: string
  activity_type: ActivityType
  details?: string
  metadata?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface CreateActivityLogParams {
  user_id: string
  activity_type: ActivityType
  details?: string
  metadata?: Record<string, any>
  ip_address?: string
  user_agent?: string
}

export interface ActivityLogFilter {
  user_id?: string
  activity_type?: ActivityType
  start_date?: string
  end_date?: string
  limit?: number
}

export interface ActivityLogSummary {
  user_id: string
  total_activities: number
  last_activity: string
  activity_breakdown: Record<ActivityType, number>
  most_common_activity: ActivityType
}

export class AuditLogService {
  /**
   * Cria entrada de log formatada
   */
  createLogEntry(params: CreateActivityLogParams): Omit<ActivityLog, 'id' | 'created_at'> {
    return {
      user_id: params.user_id,
      activity_type: params.activity_type,
      details: params.details,
      metadata: params.metadata,
      ip_address: params.ip_address,
      user_agent: params.user_agent,
    }
  }

  /**
   * Valida parâmetros do log
   */
  validateLogParams(
    params: CreateActivityLogParams
  ): { valid: boolean; error?: string } {
    if (!params.user_id || params.user_id.trim() === '') {
      return { valid: false, error: 'user_id é obrigatório' }
    }

    if (!params.activity_type) {
      return { valid: false, error: 'activity_type é obrigatório' }
    }

    return { valid: true }
  }

  /**
   * Filtra logs por critérios
   */
  filterLogs(logs: ActivityLog[], filter: ActivityLogFilter): ActivityLog[] {
    let filtered = logs

    if (filter.user_id) {
      filtered = filtered.filter(log => log.user_id === filter.user_id)
    }

    if (filter.activity_type) {
      filtered = filtered.filter(log => log.activity_type === filter.activity_type)
    }

    if (filter.start_date) {
      const startDate = new Date(filter.start_date)
      filtered = filtered.filter(log => new Date(log.created_at) >= startDate)
    }

    if (filter.end_date) {
      const endDate = new Date(filter.end_date)
      filtered = filtered.filter(log => new Date(log.created_at) <= endDate)
    }

    // Ordenar por data (mais recente primeiro)
    filtered = filtered.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    if (filter.limit && filter.limit > 0) {
      filtered = filtered.slice(0, filter.limit)
    }

    return filtered
  }

  /**
   * Gera sumário de atividades do usuário
   */
  generateActivitySummary(logs: ActivityLog[]): ActivityLogSummary | null {
    if (logs.length === 0) {
      return null
    }

    const user_id = logs[0].user_id

    // Breakdown por tipo de atividade
    const breakdown: Record<string, number> = {}
    logs.forEach(log => {
      breakdown[log.activity_type] = (breakdown[log.activity_type] || 0) + 1
    })

    // Encontrar atividade mais comum
    const mostCommonActivity = Object.entries(breakdown).reduce(
      (maxType, [type, count]) => {
        const maxCount = breakdown[maxType] || 0
        return count > maxCount ? type : maxType
      },
      Object.keys(breakdown)[0]
    ) as ActivityType

    // Última atividade (logs já devem estar ordenados)
    const lastActivity = logs.reduce((latest, current) => {
      const latestDate = new Date(latest.created_at)
      const currentDate = new Date(current.created_at)
      return currentDate > latestDate ? current : latest
    })

    return {
      user_id,
      total_activities: logs.length,
      last_activity: lastActivity.created_at,
      activity_breakdown: breakdown as Record<ActivityType, number>,
      most_common_activity: mostCommonActivity,
    }
  }

  /**
   * Formata tipo de atividade para exibição
   */
  formatActivityType(type: ActivityType): string {
    const labels: Record<ActivityType, string> = {
      login: 'Login',
      logout: 'Logout',
      course_view: 'Visualização de Curso',
      lesson_start: 'Início de Lição',
      lesson_complete: 'Conclusão de Lição',
      test_submit: 'Envio de Teste',
      enrollment_create: 'Matrícula Criada',
      certificate_request: 'Solicitação de Certificado',
      grade_override: 'Alteração de Nota',
      user_create: 'Criação de Usuário',
      user_update: 'Atualização de Usuário',
      user_delete: 'Exclusão de Usuário',
      course_create: 'Criação de Curso',
      course_update: 'Atualização de Curso',
      course_delete: 'Exclusão de Curso',
    }

    return labels[type] || type
  }

  /**
   * Verifica se atividade é sensível (requer auditoria especial)
   */
  isSensitiveActivity(type: ActivityType): boolean {
    const sensitiveActivities: ActivityType[] = [
      'grade_override',
      'user_delete',
      'course_delete',
      'certificate_request',
    ]

    return sensitiveActivities.includes(type)
  }

  /**
   * Conta atividades por tipo em um período
   */
  countActivitiesByType(
    logs: ActivityLog[],
    startDate: string,
    endDate: string
  ): Record<ActivityType, number> {
    const filtered = this.filterLogs(logs, { start_date: startDate, end_date: endDate })

    const counts: Record<string, number> = {}
    filtered.forEach(log => {
      counts[log.activity_type] = (counts[log.activity_type] || 0) + 1
    })

    return counts as Record<ActivityType, number>
  }

  /**
   * Obtém logs de atividades sensíveis
   */
  getSensitiveLogs(logs: ActivityLog[]): ActivityLog[] {
    return logs.filter(log => this.isSensitiveActivity(log.activity_type))
  }

  /**
   * Formata detalhes do log para exibição
   */
  formatLogDetails(log: ActivityLog): string {
    const typeLabel = this.formatActivityType(log.activity_type)
    const timestamp = new Date(log.created_at).toLocaleString('pt-BR')
    const details = log.details ? ` - ${log.details}` : ''

    return `[${timestamp}] ${typeLabel}${details}`
  }

  /**
   * Extrai metadados específicos do log
   */
  extractMetadata<T = any>(log: ActivityLog, key: string): T | undefined {
    if (!log.metadata) {
      return undefined
    }

    return log.metadata[key] as T
  }

  /**
   * Verifica se log está dentro de período
   */
  isLogInDateRange(log: ActivityLog, startDate: string, endDate: string): boolean {
    const logDate = new Date(log.created_at)
    const start = new Date(startDate)
    const end = new Date(endDate)

    return logDate >= start && logDate <= end
  }

  /**
   * Agrupa logs por dia
   */
  groupLogsByDay(logs: ActivityLog[]): Record<string, ActivityLog[]> {
    const grouped: Record<string, ActivityLog[]> = {}

    logs.forEach(log => {
      const date = new Date(log.created_at).toISOString().split('T')[0]
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(log)
    })

    return grouped
  }

  /**
   * Calcula média de atividades por dia
   */
  calculateAverageDailyActivity(logs: ActivityLog[]): number {
    if (logs.length === 0) {
      return 0
    }

    const grouped = this.groupLogsByDay(logs)
    const days = Object.keys(grouped).length

    if (days === 0) {
      return 0
    }

    return Math.round((logs.length / days) * 10) / 10
  }

  /**
   * Obtém atividades recentes do usuário
   */
  getRecentActivity(logs: ActivityLog[], limit: number = 10): ActivityLog[] {
    return this.filterLogs(logs, { limit })
  }

  /**
   * Verifica se há atividade suspeita (muitas ações em curto período)
   */
  detectSuspiciousActivity(
    logs: ActivityLog[],
    thresholdCount: number = 100,
    timeWindowMinutes: number = 5
  ): boolean {
    if (logs.length < thresholdCount) {
      return false
    }

    const sortedLogs = [...logs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    for (let i = 0; i <= sortedLogs.length - thresholdCount; i++) {
      const firstLog = sortedLogs[i]
      const lastLog = sortedLogs[i + thresholdCount - 1]

      const timeDiff =
        new Date(lastLog.created_at).getTime() - new Date(firstLog.created_at).getTime()
      const minutesDiff = timeDiff / (1000 * 60)

      if (minutesDiff <= timeWindowMinutes) {
        return true
      }
    }

    return false
  }
}

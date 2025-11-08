import { describe, it, expect, beforeEach } from 'vitest'
import {
  AuditLogService,
  type ActivityLog,
  type CreateActivityLogParams,
  type ActivityLogFilter,
  type ActivityType,
} from '@/lib/services/AuditLogService'

describe('AuditLogService', () => {
  let service: AuditLogService

  beforeEach(() => {
    service = new AuditLogService()
  })

  const createLog = (overrides?: Partial<ActivityLog>): ActivityLog => ({
    id: 'log-1',
    user_id: 'user-1',
    activity_type: 'login',
    details: 'User logged in',
    metadata: {},
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0',
    created_at: '2024-01-15T10:00:00Z',
    ...overrides,
  })

  const createLogParams = (
    overrides?: Partial<CreateActivityLogParams>
  ): CreateActivityLogParams => ({
    user_id: 'user-1',
    activity_type: 'login',
    details: 'User logged in',
    metadata: {},
    ...overrides,
  })

  describe('createLogEntry', () => {
    it('should create log entry with all fields', () => {
      const params = createLogParams({
        user_id: 'user-1',
        activity_type: 'course_view',
        details: 'Viewed course XYZ',
        ip_address: '192.168.1.1',
      })

      const result = service.createLogEntry(params)

      expect(result.user_id).toBe('user-1')
      expect(result.activity_type).toBe('course_view')
      expect(result.details).toBe('Viewed course XYZ')
      expect(result.ip_address).toBe('192.168.1.1')
    })

    it('should create log entry with optional fields undefined', () => {
      const params: CreateActivityLogParams = {
        user_id: 'user-1',
        activity_type: 'logout',
      }

      const result = service.createLogEntry(params)

      expect(result.user_id).toBe('user-1')
      expect(result.activity_type).toBe('logout')
      expect(result.details).toBeUndefined()
    })
  })

  describe('validateLogParams', () => {
    it('should validate correct parameters', () => {
      const params = createLogParams()
      const result = service.validateLogParams(params)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return error if user_id is missing', () => {
      const params = createLogParams({ user_id: '' })
      const result = service.validateLogParams(params)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('user_id')
    })

    it('should return error if user_id is only whitespace', () => {
      const params = createLogParams({ user_id: '   ' })
      const result = service.validateLogParams(params)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('user_id')
    })

    it('should return error if activity_type is missing', () => {
      const params = { user_id: 'user-1' } as CreateActivityLogParams
      const result = service.validateLogParams(params)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('activity_type')
    })
  })

  describe('filterLogs', () => {
    it('should filter by user_id', () => {
      const logs = [
        createLog({ user_id: 'user-1' }),
        createLog({ user_id: 'user-2' }),
        createLog({ user_id: 'user-1' }),
      ]

      const result = service.filterLogs(logs, { user_id: 'user-1' })

      expect(result).toHaveLength(2)
      expect(result.every(log => log.user_id === 'user-1')).toBe(true)
    })

    it('should filter by activity_type', () => {
      const logs = [
        createLog({ activity_type: 'login' }),
        createLog({ activity_type: 'logout' }),
        createLog({ activity_type: 'login' }),
      ]

      const result = service.filterLogs(logs, { activity_type: 'login' })

      expect(result).toHaveLength(2)
      expect(result.every(log => log.activity_type === 'login')).toBe(true)
    })

    it('should filter by start_date', () => {
      const logs = [
        createLog({ created_at: '2024-01-10T00:00:00Z' }),
        createLog({ created_at: '2024-01-15T00:00:00Z' }),
        createLog({ created_at: '2024-01-20T00:00:00Z' }),
      ]

      const result = service.filterLogs(logs, { start_date: '2024-01-15T00:00:00Z' })

      expect(result).toHaveLength(2)
    })

    it('should filter by end_date', () => {
      const logs = [
        createLog({ created_at: '2024-01-10T00:00:00Z' }),
        createLog({ created_at: '2024-01-15T00:00:00Z' }),
        createLog({ created_at: '2024-01-20T00:00:00Z' }),
      ]

      const result = service.filterLogs(logs, { end_date: '2024-01-15T00:00:00Z' })

      expect(result).toHaveLength(2)
    })

    it('should apply limit', () => {
      const logs = [
        createLog({ id: '1', created_at: '2024-01-15T00:00:00Z' }),
        createLog({ id: '2', created_at: '2024-01-16T00:00:00Z' }),
        createLog({ id: '3', created_at: '2024-01-17T00:00:00Z' }),
      ]

      const result = service.filterLogs(logs, { limit: 2 })

      expect(result).toHaveLength(2)
    })

    it('should sort by created_at descending', () => {
      const logs = [
        createLog({ id: '1', created_at: '2024-01-10T00:00:00Z' }),
        createLog({ id: '2', created_at: '2024-01-20T00:00:00Z' }),
        createLog({ id: '3', created_at: '2024-01-15T00:00:00Z' }),
      ]

      const result = service.filterLogs(logs, {})

      expect(result[0].id).toBe('2')
      expect(result[1].id).toBe('3')
      expect(result[2].id).toBe('1')
    })

    it('should combine multiple filters', () => {
      const logs = [
        createLog({ user_id: 'user-1', activity_type: 'login', created_at: '2024-01-10T00:00:00Z' }),
        createLog({ user_id: 'user-1', activity_type: 'logout', created_at: '2024-01-15T00:00:00Z' }),
        createLog({ user_id: 'user-2', activity_type: 'login', created_at: '2024-01-20T00:00:00Z' }),
      ]

      const result = service.filterLogs(logs, {
        user_id: 'user-1',
        activity_type: 'login',
      })

      expect(result).toHaveLength(1)
      expect(result[0].user_id).toBe('user-1')
      expect(result[0].activity_type).toBe('login')
    })
  })

  describe('generateActivitySummary', () => {
    it('should generate activity summary', () => {
      const logs = [
        createLog({ activity_type: 'login', created_at: '2024-01-15T10:00:00Z' }),
        createLog({ activity_type: 'login', created_at: '2024-01-15T11:00:00Z' }),
        createLog({ activity_type: 'logout', created_at: '2024-01-15T12:00:00Z' }),
      ]

      const result = service.generateActivitySummary(logs)

      expect(result).not.toBeNull()
      expect(result!.total_activities).toBe(3)
      expect(result!.activity_breakdown.login).toBe(2)
      expect(result!.activity_breakdown.logout).toBe(1)
      expect(result!.most_common_activity).toBe('login')
    })

    it('should return null for empty logs', () => {
      const result = service.generateActivitySummary([])

      expect(result).toBeNull()
    })

    it('should identify last activity correctly', () => {
      const logs = [
        createLog({ created_at: '2024-01-10T00:00:00Z' }),
        createLog({ created_at: '2024-01-20T00:00:00Z' }),
        createLog({ created_at: '2024-01-15T00:00:00Z' }),
      ]

      const result = service.generateActivitySummary(logs)

      expect(result!.last_activity).toBe('2024-01-20T00:00:00Z')
    })
  })

  describe('formatActivityType', () => {
    it('should format activity types to Portuguese', () => {
      expect(service.formatActivityType('login')).toBe('Login')
      expect(service.formatActivityType('logout')).toBe('Logout')
      expect(service.formatActivityType('course_view')).toBe('Visualização de Curso')
      expect(service.formatActivityType('grade_override')).toBe('Alteração de Nota')
    })

    it('should return original type if not mapped', () => {
      expect(service.formatActivityType('unknown' as ActivityType)).toBe('unknown')
    })
  })

  describe('isSensitiveActivity', () => {
    it('should identify sensitive activities', () => {
      expect(service.isSensitiveActivity('grade_override')).toBe(true)
      expect(service.isSensitiveActivity('user_delete')).toBe(true)
      expect(service.isSensitiveActivity('course_delete')).toBe(true)
      expect(service.isSensitiveActivity('certificate_request')).toBe(true)
    })

    it('should return false for non-sensitive activities', () => {
      expect(service.isSensitiveActivity('login')).toBe(false)
      expect(service.isSensitiveActivity('logout')).toBe(false)
      expect(service.isSensitiveActivity('course_view')).toBe(false)
    })
  })

  describe('countActivitiesByType', () => {
    it('should count activities by type in period', () => {
      const logs = [
        createLog({ activity_type: 'login', created_at: '2024-01-15T00:00:00Z' }),
        createLog({ activity_type: 'login', created_at: '2024-01-16T00:00:00Z' }),
        createLog({ activity_type: 'logout', created_at: '2024-01-17T00:00:00Z' }),
        createLog({ activity_type: 'login', created_at: '2024-01-25T00:00:00Z' }),
      ]

      const result = service.countActivitiesByType(logs, '2024-01-15', '2024-01-20')

      expect(result.login).toBe(2)
      expect(result.logout).toBe(1)
    })

    it('should return empty counts for empty period', () => {
      const logs = [createLog({ created_at: '2024-01-01T00:00:00Z' })]

      const result = service.countActivitiesByType(logs, '2024-02-01', '2024-02-10')

      expect(Object.keys(result)).toHaveLength(0)
    })
  })

  describe('getSensitiveLogs', () => {
    it('should filter only sensitive logs', () => {
      const logs = [
        createLog({ activity_type: 'login' }),
        createLog({ activity_type: 'grade_override' }),
        createLog({ activity_type: 'logout' }),
        createLog({ activity_type: 'user_delete' }),
      ]

      const result = service.getSensitiveLogs(logs)

      expect(result).toHaveLength(2)
      expect(result.every(log => service.isSensitiveActivity(log.activity_type))).toBe(true)
    })

    it('should return empty array if no sensitive logs', () => {
      const logs = [createLog({ activity_type: 'login' }), createLog({ activity_type: 'logout' })]

      const result = service.getSensitiveLogs(logs)

      expect(result).toHaveLength(0)
    })
  })

  describe('formatLogDetails', () => {
    it('should format log details with all information', () => {
      const log = createLog({
        activity_type: 'login',
        details: 'Successful login',
        created_at: '2024-01-15T10:30:00Z',
      })

      const result = service.formatLogDetails(log)

      expect(result).toContain('Login')
      expect(result).toContain('Successful login')
    })

    it('should format log details without details field', () => {
      const log = createLog({
        activity_type: 'logout',
        details: undefined,
      })

      const result = service.formatLogDetails(log)

      expect(result).toContain('Logout')
      expect(result).not.toContain(' - ')
    })
  })

  describe('extractMetadata', () => {
    it('should extract metadata by key', () => {
      const log = createLog({
        metadata: { course_id: 'course-123', test_id: 'test-456' },
      })

      expect(service.extractMetadata(log, 'course_id')).toBe('course-123')
      expect(service.extractMetadata(log, 'test_id')).toBe('test-456')
    })

    it('should return undefined for missing key', () => {
      const log = createLog({ metadata: { course_id: 'course-123' } })

      expect(service.extractMetadata(log, 'missing_key')).toBeUndefined()
    })

    it('should return undefined if no metadata', () => {
      const log = createLog({ metadata: undefined })

      expect(service.extractMetadata(log, 'any_key')).toBeUndefined()
    })
  })

  describe('isLogInDateRange', () => {
    it('should return true if log is within range', () => {
      const log = createLog({ created_at: '2024-01-15T00:00:00Z' })

      expect(service.isLogInDateRange(log, '2024-01-10', '2024-01-20')).toBe(true)
    })

    it('should return false if log is before range', () => {
      const log = createLog({ created_at: '2024-01-05T00:00:00Z' })

      expect(service.isLogInDateRange(log, '2024-01-10', '2024-01-20')).toBe(false)
    })

    it('should return false if log is after range', () => {
      const log = createLog({ created_at: '2024-01-25T00:00:00Z' })

      expect(service.isLogInDateRange(log, '2024-01-10', '2024-01-20')).toBe(false)
    })

    it('should include boundary dates', () => {
      const log1 = createLog({ created_at: '2024-01-10T00:00:00Z' })
      const log2 = createLog({ created_at: '2024-01-20T00:00:00Z' })

      expect(service.isLogInDateRange(log1, '2024-01-10', '2024-01-20')).toBe(true)
      expect(service.isLogInDateRange(log2, '2024-01-10', '2024-01-20')).toBe(true)
    })
  })

  describe('groupLogsByDay', () => {
    it('should group logs by day', () => {
      const logs = [
        createLog({ created_at: '2024-01-15T10:00:00Z' }),
        createLog({ created_at: '2024-01-15T15:00:00Z' }),
        createLog({ created_at: '2024-01-16T10:00:00Z' }),
      ]

      const result = service.groupLogsByDay(logs)

      expect(result['2024-01-15']).toHaveLength(2)
      expect(result['2024-01-16']).toHaveLength(1)
    })

    it('should return empty object for empty logs', () => {
      const result = service.groupLogsByDay([])

      expect(Object.keys(result)).toHaveLength(0)
    })
  })

  describe('calculateAverageDailyActivity', () => {
    it('should calculate average activity per day', () => {
      const logs = [
        createLog({ created_at: '2024-01-15T10:00:00Z' }),
        createLog({ created_at: '2024-01-15T15:00:00Z' }),
        createLog({ created_at: '2024-01-16T10:00:00Z' }),
        createLog({ created_at: '2024-01-16T15:00:00Z' }),
        createLog({ created_at: '2024-01-17T10:00:00Z' }),
      ]

      const result = service.calculateAverageDailyActivity(logs)

      expect(result).toBe(1.7) // 5 logs / 3 days = 1.666... ≈ 1.7
    })

    it('should return 0 for empty logs', () => {
      expect(service.calculateAverageDailyActivity([])).toBe(0)
    })

    it('should handle single day', () => {
      const logs = [
        createLog({ created_at: '2024-01-15T10:00:00Z' }),
        createLog({ created_at: '2024-01-15T15:00:00Z' }),
      ]

      const result = service.calculateAverageDailyActivity(logs)

      expect(result).toBe(2.0)
    })
  })

  describe('getRecentActivity', () => {
    it('should return most recent logs', () => {
      const logs = [
        createLog({ id: '1', created_at: '2024-01-10T00:00:00Z' }),
        createLog({ id: '2', created_at: '2024-01-20T00:00:00Z' }),
        createLog({ id: '3', created_at: '2024-01-15T00:00:00Z' }),
      ]

      const result = service.getRecentActivity(logs, 2)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('2')
      expect(result[1].id).toBe('3')
    })

    it('should default to 10 logs', () => {
      const logs = Array.from({ length: 15 }, (_, i) =>
        createLog({ id: `log-${i}`, created_at: `2024-01-${i + 1}T00:00:00Z` })
      )

      const result = service.getRecentActivity(logs)

      expect(result).toHaveLength(10)
    })
  })

  describe('detectSuspiciousActivity', () => {
    it('should detect suspicious activity (many actions in short time)', () => {
      // Create 100 logs within 4 minutes (240 seconds)
      const logs = Array.from({ length: 100 }, (_, i) => {
        const seconds = Math.floor((i * 240) / 100) // Distribute evenly in 4 minutes
        const minutes = Math.floor(seconds / 60)
        const secs = seconds % 60
        return createLog({
          created_at: `2024-01-15T10:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}Z`,
        })
      })

      const result = service.detectSuspiciousActivity(logs, 100, 5)

      expect(result).toBe(true)
    })

    it('should return false for normal activity', () => {
      const logs = Array.from({ length: 10 }, (_, i) =>
        createLog({ created_at: `2024-01-15T${10 + i}:00:00Z` })
      )

      const result = service.detectSuspiciousActivity(logs, 100, 5)

      expect(result).toBe(false)
    })

    it('should return false if below threshold', () => {
      const logs = Array.from({ length: 50 }, (_, i) =>
        createLog({ created_at: `2024-01-15T10:00:${i}Z` })
      )

      const result = service.detectSuspiciousActivity(logs, 100, 5)

      expect(result).toBe(false)
    })
  })
})

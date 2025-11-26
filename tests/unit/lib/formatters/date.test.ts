import { describe, it, expect, beforeEach, vi } from 'vitest'
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/formatters/date'

describe('Date Formatters', () => {
  describe('formatDate', () => {
    it('should format ISO string to "dd/mm/yyyy"', () => {
      const result = formatDate('2024-01-15T10:30:00Z')
      expect(result).toBe('15/01/2024')
    })

    it('should format Date object to "dd/mm/yyyy"', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = formatDate(date)
      expect(result).toBe('15/01/2024')
    })
  })

  describe('formatDateTime', () => {
    it('should include time "dd/mm/yyyy HH:mm"', () => {
      const result = formatDateTime('2024-01-15T10:30:00Z')
      expect(result).toMatch(/15\/01\/2024 \d{2}:\d{2}/)
    })

    it('should format Date object with time', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = formatDateTime(date)
      expect(result).toMatch(/15\/01\/2024 \d{2}:\d{2}/)
    })
  })

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    it('should return relative time for recent date', () => {
      const twoHoursAgo = new Date('2024-01-15T10:00:00Z')
      const result = formatRelativeTime(twoHoursAgo)
      expect(result).toContain('há')
      expect(result).toContain('horas')
    })

    it('should handle ISO string input', () => {
      const result = formatRelativeTime('2024-01-15T10:00:00Z')
      expect(result).toContain('há')
    })

    vi.useRealTimers()
  })
})

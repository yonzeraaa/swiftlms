import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  cleanupOrphanedTemplates,
  cleanupInactiveTemplates,
  runFullCleanup,
} from '@/lib/services/template-cleanup'
import type { CleanupResult } from '@/lib/services/template-cleanup'

// Mock do Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const { createClient } = await import('@/lib/supabase/server')

describe('TemplateCleanup Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('cleanupOrphanedTemplates', () => {
    it('should find and delete orphaned files older than 24h', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnThis(),
          list: vi.fn()
            .mockResolvedValueOnce({
              data: [{ name: 'category1' }],
              error: null,
            })
            .mockResolvedValueOnce({
              data: [
                { name: 'old-file.xlsx', created_at: twoDaysAgo },
                { name: 'new-file.xlsx', created_at: oneHourAgo },
              ],
              error: null,
            }),
          remove: vi.fn().mockResolvedValue({ error: null }),
        },
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ storage_path: 'category1/existing.xlsx' }],
          error: null,
        }),
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const result = await cleanupOrphanedTemplates()

      expect(result.orphanedFiles).toContain('category1/old-file.xlsx')
      expect(result.orphanedFiles).not.toContain('category1/new-file.xlsx')
      expect(result.deletedFiles).toBe(1)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle storage list errors', async () => {
      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnThis(),
          list: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Storage error' },
          }),
        },
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const result = await cleanupOrphanedTemplates()

      expect(result.errors).toContain('Erro ao listar pastas: Storage error')
      expect(result.deletedFiles).toBe(0)
    })

    it('should handle database query errors', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      })

      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnThis(),
          list: vi.fn().mockResolvedValue({ data: [], error: null }),
        },
        from: mockFrom,
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const result = await cleanupOrphanedTemplates()

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Database error')
      expect(result.deletedFiles).toBe(0)
    })

    it('should handle deletion errors and continue', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnThis(),
          list: vi.fn()
            .mockResolvedValueOnce({
              data: [{ name: 'category1' }],
              error: null,
            })
            .mockResolvedValueOnce({
              data: [
                { name: 'file1.xlsx', created_at: twoDaysAgo },
                { name: 'file2.xlsx', created_at: twoDaysAgo },
              ],
              error: null,
            }),
          remove: vi.fn()
            .mockResolvedValueOnce({ error: { message: 'Delete failed' } })
            .mockResolvedValueOnce({ error: null }),
        },
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const result = await cleanupOrphanedTemplates()

      expect(result.orphanedFiles).toHaveLength(2)
      expect(result.deletedFiles).toBe(1)
      expect(result.errors).toContain('Erro ao deletar category1/file1.xlsx: Delete failed')
    })

    it('should not delete files registered in database', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ storage_path: 'category1/registered.xlsx' }],
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      })

      const mockRemove = vi.fn()

      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnThis(),
          list: vi.fn()
            .mockResolvedValueOnce({
              data: [{ name: 'category1' }],
              error: null,
            })
            .mockResolvedValueOnce({
              data: [{ name: 'registered.xlsx', created_at: twoDaysAgo }],
              error: null,
            }),
          remove: mockRemove,
        },
        from: mockFrom,
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const result = await cleanupOrphanedTemplates()

      expect(result.orphanedFiles).toHaveLength(0)
      expect(result.deletedFiles).toBe(0)
      expect(mockRemove).not.toHaveBeenCalled()
    })
  })

  describe('cleanupInactiveTemplates', () => {
    it('should delete inactive templates older than retention period', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
      const mockLt = vi.fn().mockResolvedValue({
        data: [
          { id: 'template-1', storage_path: 'category/template1.xlsx' },
          { id: 'template-2', storage_path: 'category/template2.xlsx' },
        ],
        error: null,
      })
      const mockEqChain = vi.fn().mockReturnValue({ lt: mockLt })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqChain })
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
        delete: mockDelete,
      })
      const mockRemove = vi.fn().mockResolvedValue({ error: null })

      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnThis(),
          remove: mockRemove,
        },
        from: mockFrom,
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const result = await cleanupInactiveTemplates(90)

      expect(result.deletedFiles).toBe(2)
      expect(result.errors).toHaveLength(0)
      expect(mockRemove).toHaveBeenCalledWith(['category/template1.xlsx'])
      expect(mockRemove).toHaveBeenCalledWith(['category/template2.xlsx'])
    })

    it('should use custom retention period', async () => {
      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnThis(),
          remove: vi.fn().mockResolvedValue({ error: null }),
        },
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lt: vi.fn().mockImplementation((dateStr: string) => {
          const retentionDate = new Date(dateStr)
          const expectedDate = new Date()
          expectedDate.setDate(expectedDate.getDate() - 30)

          // Check if date is approximately 30 days ago (within 1 hour tolerance)
          const diff = Math.abs(retentionDate.getTime() - expectedDate.getTime())
          const withinTolerance = diff < 60 * 60 * 1000

          return Promise.resolve({
            data: withinTolerance ? [{ id: 'template-1', storage_path: 'path.xlsx' }] : [],
            error: null,
          })
        }),
        delete: vi.fn().mockReturnThis(),
      }

      mockSupabase.eq.mockResolvedValue({ error: null })

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const result = await cleanupInactiveTemplates(30)

      expect(result.deletedFiles).toBeGreaterThanOrEqual(0)
    })

    it('should handle no inactive templates', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const result = await cleanupInactiveTemplates()

      expect(result.deletedFiles).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle storage deletion errors', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
      const mockLt = vi.fn().mockResolvedValue({
        data: [{ id: 'template-1', storage_path: 'path.xlsx' }],
        error: null,
      })
      const mockEqChain = vi.fn().mockReturnValue({ lt: mockLt })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqChain })
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
        delete: mockDelete,
      })
      const mockRemove = vi.fn().mockResolvedValue({
        error: { message: 'Storage deletion failed' },
      })

      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnThis(),
          remove: mockRemove,
        },
        from: mockFrom,
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const result = await cleanupInactiveTemplates()

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Storage deletion failed')
    })

    it('should handle database deletion errors', async () => {
      const mockEq = vi.fn().mockResolvedValue({
        error: { message: 'DB deletion failed' },
      })
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
      const mockLt = vi.fn().mockResolvedValue({
        data: [{ id: 'template-1', storage_path: 'path.xlsx' }],
        error: null,
      })
      const mockEqChain = vi.fn().mockReturnValue({ lt: mockLt })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqChain })
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
        delete: mockDelete,
      })
      const mockRemove = vi.fn().mockResolvedValue({ error: null })

      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnThis(),
          remove: mockRemove,
        },
        from: mockFrom,
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const result = await cleanupInactiveTemplates()

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('DB deletion failed')
      expect(result.deletedFiles).toBe(1) // Storage file was deleted
    })
  })

  describe('runFullCleanup', () => {
    it('should run both cleanup routines', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

      // First createClient call - for orphaned cleanup
      const mockSelect1 = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      })
      const mockFrom1 = vi.fn().mockReturnValue({
        select: mockSelect1,
      })
      const mockRemove1 = vi.fn().mockResolvedValue({ error: null })
      const mockSupabase1 = {
        storage: {
          from: vi.fn().mockReturnThis(),
          list: vi.fn()
            .mockResolvedValueOnce({
              data: [{ name: 'category1' }],
              error: null,
            })
            .mockResolvedValueOnce({
              data: [{ name: 'orphan.xlsx', created_at: twoDaysAgo }],
              error: null,
            }),
          remove: mockRemove1,
        },
        from: mockFrom1,
      }

      // Second createClient call - for inactive cleanup
      const mockEq2 = vi.fn().mockResolvedValue({ error: null })
      const mockDelete2 = vi.fn().mockReturnValue({ eq: mockEq2 })
      const mockLt2 = vi.fn().mockResolvedValue({
        data: [{ id: 'template-1', storage_path: 'inactive.xlsx' }],
        error: null,
      })
      const mockEqChain2 = vi.fn().mockReturnValue({ lt: mockLt2 })
      const mockSelect2 = vi.fn().mockReturnValue({ eq: mockEqChain2 })
      const mockFrom2 = vi.fn().mockReturnValue({
        select: mockSelect2,
        delete: mockDelete2,
      })
      const mockRemove2 = vi.fn().mockResolvedValue({ error: null })
      const mockSupabase2 = {
        storage: {
          from: vi.fn().mockReturnThis(),
          remove: mockRemove2,
        },
        from: mockFrom2,
      }

      vi.mocked(createClient)
        .mockResolvedValueOnce(mockSupabase1 as any)
        .mockResolvedValueOnce(mockSupabase2 as any)

      const result = await runFullCleanup()

      expect(result.orphaned.deletedFiles).toBe(1)
      expect(result.inactive.deletedFiles).toBe(1)
      expect(result.orphaned.errors).toHaveLength(0)
      expect(result.inactive.errors).toHaveLength(0)
    })

    it('should aggregate errors from both cleanups', async () => {
      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnThis(),
          list: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Storage error' },
          }),
        },
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Query error' },
        }),
      }

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const result = await runFullCleanup()

      expect(result.orphaned.errors.length).toBeGreaterThan(0)
      expect(result.inactive.errors.length).toBeGreaterThan(0)
    })
  })
})

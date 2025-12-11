import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn()
}))

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { POST } from '../dummy-student/route'

const createClientMock = vi.mocked(createClient)
const createAdminClientMock = vi.mocked(createAdminClient)

describe('POST /api/admin/dummy-student', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null })
      }
    } as any)

    const response = await POST()

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Não autenticado')
  })

  it('returns 403 when user is not admin', async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null
        })
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'student' },
              error: null
            })
          }))
        }))
      }))
    } as any)

    const response = await POST()

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Acesso negado. Apenas administradores.')
  })

  it('creates dummy student when no courses exist', async () => {
    const mockAdminUser = { id: 'admin-123' }
    const mockDummyUserId = 'dummy-user-123'

    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockAdminUser },
          error: null
        })
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null
            })
          }))
        }))
      }))
    } as any)

    createAdminClientMock.mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [] },
            error: null
          }),
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: mockDummyUserId } },
            error: null
          })
        }
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
            upsert: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'courses') {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null })
          }
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          upsert: vi.fn().mockResolvedValue({ error: null })
        }
      })
    } as any)

    const response = await POST()

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.email).toBe('dummy.student@swiftlms.test')
    expect(data.password).toBe('DummyStudent123!')
    expect(data.message).toContain('não há cursos')
  })

  it('creates dummy student with enrollments when courses exist', async () => {
    const mockAdminUser = { id: 'admin-123' }
    const mockDummyUserId = 'dummy-user-123'
    const mockCourse = { id: 'course-1', title: 'Test Course', duration_hours: 40 }
    const mockModule = { id: 'module-1' }
    const mockLesson = { id: 'lesson-1', module_id: 'module-1' }
    const mockTest = { id: 'test-1', subject_id: 'subject-1', course_id: 'course-1' }

    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockAdminUser },
          error: null
        })
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null
            })
          }))
        }))
      }))
    } as any)

    const mockEnrollmentId = 'enrollment-1'

    createAdminClientMock.mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [{ id: mockDummyUserId, email: 'dummy.student@swiftlms.test' }] },
            error: null
          })
        }
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'courses') {
          return {
            select: vi.fn().mockResolvedValue({ data: [mockCourse], error: null })
          }
        }
        if (table === 'enrollments') {
          return {
            upsert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: mockEnrollmentId },
                  error: null
                })
              }))
            })),
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: mockEnrollmentId },
                    error: null
                  })
                }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null })
            }))
          }
        }
        if (table === 'course_modules') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [mockModule], error: null })
            }))
          }
        }
        if (table === 'enrollment_modules') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'lessons') {
          return {
            select: vi.fn(() => ({
              in: vi.fn().mockResolvedValue({ data: [mockLesson], error: null })
            }))
          }
        }
        if (table === 'lesson_progress') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'tests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [mockTest], error: null })
            }))
          }
        }
        if (table === 'test_attempts') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: null, error: null })
                }))
              }))
            })),
            insert: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'test_grades') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'tcc_submissions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: null, error: null })
                }))
              }))
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null })
            }))
          }
        }
        if (table === 'certificate_requests') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: null, error: null })
                  }))
                }))
              }))
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null })
            }))
          }
        }
        if (table === 'certificates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: null, error: null })
                }))
              }))
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null })
            }))
          }
        }
        if (table === 'student_grade_overrides') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null })
          }
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          upsert: vi.fn().mockResolvedValue({ error: null })
        }
      })
    } as any)

    const response = await POST()

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.email).toBe('dummy.student@swiftlms.test')
    expect(data.password).toBe('DummyStudent123!')
    expect(data.stats).toBeDefined()
    expect(data.stats.enrollments).toBe(1)
  })

  it('reuses existing dummy user when already exists', async () => {
    const mockAdminUser = { id: 'admin-123' }
    const mockExistingDummyUserId = 'existing-dummy-123'

    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockAdminUser },
          error: null
        })
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null
            })
          }))
        }))
      }))
    } as any)

    createAdminClientMock.mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [{ id: mockExistingDummyUserId, email: 'dummy.student@swiftlms.test' }]
            },
            error: null
          })
        }
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'courses') {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null })
          }
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          upsert: vi.fn().mockResolvedValue({ error: null })
        }
      })
    } as any)

    const response = await POST()

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.userId).toBe(mockExistingDummyUserId)
  })
})

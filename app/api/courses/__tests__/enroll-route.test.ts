import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

import { createClient } from '@/lib/supabase/server'
import { POST } from '../enroll/route'

const createClientMock = vi.mocked(createClient)

describe('POST /api/courses/enroll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when session is missing', async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null })
      }
    } as any)

    const request = { json: vi.fn() } as unknown as NextRequest
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('creates enrollments and logs activity', async () => {
    const enrollInsert = vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [{ id: 'enroll-1' }], error: null })
    }))
    const activityInsert = vi.fn().mockResolvedValue({ error: null })

    createClientMock.mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'admin-id' } } },
          error: null
        })
      },
      from: vi.fn((table: string) => {
        if (table === 'enrollments') {
          return {
            insert: enrollInsert
          }
        }
        if (table === 'activity_logs') {
          return {
            insert: activityInsert
          }
        }
        throw new Error(`Unexpected table ${table}`)
      })
    } as any)

    const request = {
      json: vi.fn().mockResolvedValue({
        courseId: 'course-1',
        studentIds: ['student-1', 'student-2']
      })
    } as unknown as NextRequest

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.enrollments).toEqual([{ id: 'enroll-1' }])

    expect(enrollInsert).toHaveBeenCalledWith([
      expect.objectContaining({ user_id: 'student-1', course_id: 'course-1' }),
      expect.objectContaining({ user_id: 'student-2', course_id: 'course-1' })
    ])

    expect(activityInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'admin-id',
      action: 'enroll_students'
    }))
  })
})

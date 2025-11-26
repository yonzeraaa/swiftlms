import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

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

  it('creates enrollments, links all modules by default and logs activity', async () => {
    const courseModulesEq = vi.fn().mockResolvedValue({
      data: [
        { id: 'module-required', is_required: true },
        { id: 'module-optional', is_required: false }
      ],
      error: null
    })

    const enrollInsert = vi.fn(() => ({
      select: vi.fn().mockResolvedValue({
        data: [
          { id: 'enroll-1', user_id: 'student-1' },
          { id: 'enroll-2', user_id: 'student-2' }
        ],
        error: null
      })
    }))

    const enrollmentModulesInsert = vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [{ id: 'link-1' }], error: null })
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
        if (table === 'course_modules') {
          return {
            select: vi.fn(() => ({ eq: courseModulesEq }))
          }
        }
        if (table === 'enrollments') {
          return {
            insert: enrollInsert
          }
        }
        if (table === 'enrollment_modules') {
          return {
            insert: enrollmentModulesInsert
          }
        }
        if (table === 'activity_logs') {
          return {
            insert: activityInsert
          }
        }
        throw new Error(`Unexpected table ${table}`)
      })
    } as unknown as SupabaseClient<Database>)

    const request = {
      json: vi.fn().mockResolvedValue({
        courseId: 'course-1',
        studentIds: ['student-1', 'student-2']
      })
    } as unknown as NextRequest

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.enrollments).toEqual([
      { id: 'enroll-1', user_id: 'student-1' },
      { id: 'enroll-2', user_id: 'student-2' }
    ])

    expect(enrollInsert).toHaveBeenCalledWith([
      expect.objectContaining({ user_id: 'student-1', course_id: 'course-1' }),
      expect.objectContaining({ user_id: 'student-2', course_id: 'course-1' })
    ])

    expect(enrollmentModulesInsert).toHaveBeenCalled()
    const calls = enrollmentModulesInsert.mock.calls as unknown[][]
    const firstAssignmentCall = calls[0]
    if (!firstAssignmentCall) {
      throw new Error('enrollmentModulesInsert should be called at least once')
    }
    const [assignmentArgs] = firstAssignmentCall
    expect(assignmentArgs).toEqual(expect.arrayContaining([
      { enrollment_id: 'enroll-1', module_id: 'module-required' },
      { enrollment_id: 'enroll-1', module_id: 'module-optional' },
      { enrollment_id: 'enroll-2', module_id: 'module-required' },
      { enrollment_id: 'enroll-2', module_id: 'module-optional' }
    ]))

    expect(activityInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'admin-id',
      action: 'enroll_students'
    }))
  })

  it('respects optional module selection for individual students', async () => {
    const courseModulesEq = vi.fn().mockResolvedValue({
      data: [
        { id: 'module-required', is_required: true },
        { id: 'module-optional-a', is_required: false },
        { id: 'module-optional-b', is_required: false }
      ],
      error: null
    })

    const enrollInsert = vi.fn(() => ({
      select: vi.fn().mockResolvedValue({
        data: [
          { id: 'enroll-1', user_id: 'student-1' }
        ],
        error: null
      })
    }))

    const enrollmentModulesInsert = vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [{ id: 'link-1' }], error: null })
    }))

    createClientMock.mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'admin-id' } } },
          error: null
        })
      },
      from: vi.fn((table: string) => {
        if (table === 'course_modules') {
          return {
            select: vi.fn(() => ({ eq: courseModulesEq }))
          }
        }
        if (table === 'enrollments') {
          return {
            insert: enrollInsert
          }
        }
        if (table === 'enrollment_modules') {
          return {
            insert: enrollmentModulesInsert
          }
        }
        if (table === 'activity_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          }
        }
        throw new Error(`Unexpected table ${table}`)
      })
    } as unknown as SupabaseClient<Database>)

    const request = {
      json: vi.fn().mockResolvedValue({
        courseId: 'course-1',
        students: [
          {
            studentId: 'student-1',
            moduleIds: ['module-optional-b']
          }
        ]
      })
    } as unknown as NextRequest

    const response = await POST(request)
    expect(response.status).toBe(200)

    const calls = enrollmentModulesInsert.mock.calls as unknown[][]
    const firstCall = calls[0]
    if (!firstCall) {
      throw new Error('enrollmentModulesInsert should be called at least once')
    }
    const [assignmentArgs] = firstCall
    expect(assignmentArgs).toEqual([
      { enrollment_id: 'enroll-1', module_id: 'module-required' },
      { enrollment_id: 'enroll-1', module_id: 'module-optional-b' }
    ])
  })
})

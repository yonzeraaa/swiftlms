import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

import { createClient } from '@/lib/supabase/server'
import { POST, PUT } from '../check-eligibility/route'

const createClientMock = vi.mocked(createClient)

interface EligibilityOptions {
  progressPercentage?: number
  bestScore?: number
  existingRequest?: boolean
  hasCertificate?: boolean
}

function buildEligibilitySupabaseStub(options: EligibilityOptions = {}) {
  const {
    progressPercentage = 100,
    bestScore = 80,
    existingRequest = false,
    hasCertificate = false
  } = options

  const totalLessons = 10
  const completedLessons = Math.round((progressPercentage / 100) * totalLessons)

  const enrollmentRecord = {
    id: 'enroll-1',
    user_id: 'student-1',
    course_id: 'course-1',
    course: { id: 'course-1' }
  }

  const tables: Record<string, any> = {
    enrollments: {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: enrollmentRecord, error: null })
          }))
        }))
      }))
    },
    course_modules: {
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [{ id: 'module-1' }], error: null }))
      }))
    },
    lessons: {
      select: vi.fn(() => ({
        in: vi.fn(() => Promise.resolve({ count: totalLessons, error: null }))
      }))
    },
    lesson_progress: {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ count: completedLessons, error: null }))
        }))
      }))
    },
    test_grades: {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [{ best_score: bestScore }], error: null }))
        }))
      }))
    },
    certificate_requests: {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: existingRequest ? { id: 'req-1', status: 'pending' } : null, error: null })
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'req-created' }, error: null })
        }))
      }))
    },
    certificates: {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: hasCertificate ? { id: 'cert-1' } : null, error: null })
          }))
        }))
      }))
    },
    activity_logs: {
      insert: vi.fn().mockResolvedValue({ error: null })
    }
  }

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'student-1' } } })
    },
    from: vi.fn((table: string) => {
      const handler = tables[table]
      if (!handler) {
        throw new Error(`Unexpected table: ${table}`)
      }
      return handler
    })
  }

  return {
    supabase,
    tables
  }
}

describe('certificate eligibility API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns eligibility details when requirements are met', async () => {
    const { supabase } = buildEligibilitySupabaseStub({ progressPercentage: 100, bestScore: 90 })
    createClientMock.mockResolvedValue(supabase as any)

    const request = {
      json: vi.fn().mockResolvedValue({ courseId: 'course-1', enrollmentId: 'enroll-1' })
    } as any

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.eligible).toBe(true)
    expect(payload.progressPercentage).toBe(100)
    expect(payload.bestTestScore).toBe(90)
  })

  it('marks user as ineligible when progress or score is insufficient', async () => {
    const { supabase } = buildEligibilitySupabaseStub({ progressPercentage: 80, bestScore: 60 })
    createClientMock.mockResolvedValue(supabase as any)

    const request = {
      json: vi.fn().mockResolvedValue({ courseId: 'course-1', enrollmentId: 'enroll-1' })
    } as any

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.eligible).toBe(false)
    expect(payload.requirementsMet).toBe(false)
  })

  it('creates a certificate request via PUT when eligible', async () => {
    const eligibilityStub = buildEligibilitySupabaseStub({ progressPercentage: 100, bestScore: 90 })
    const requestStub = buildEligibilitySupabaseStub({ progressPercentage: 100, bestScore: 90 })

    createClientMock
      .mockResolvedValueOnce(eligibilityStub.supabase as any)
      .mockResolvedValueOnce(requestStub.supabase as any)

    const request = {
      json: vi.fn().mockResolvedValue({ courseId: 'course-1', enrollmentId: 'enroll-1' }),
      url: 'https://example.com/api/certificates/check-eligibility',
      headers: new Headers()
    } as any

    const response = await PUT(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(eligibilityStub.tables.certificate_requests.insert).toHaveBeenCalled()
    expect(eligibilityStub.tables.activity_logs.insert).toHaveBeenCalled()
  })
})

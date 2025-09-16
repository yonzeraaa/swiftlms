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
  hasApprovedTcc?: boolean
}

function createMutatingTable(initialRows: any[] = []) {
  const rows = [...initialRows]

  const createBuilder = () => {
    let filtered = [...rows]
    const builder: any = {
      eq: vi.fn((column: string, value: any) => {
        filtered = filtered.filter(row => row[column] === value)
        return builder
      }),
      order: vi.fn(() => builder),
      in: vi.fn((_column: string, _values: any[]) => builder),
      then: (resolve: any, reject?: any) =>
        Promise.resolve({ data: filtered, error: null }).then(resolve, reject),
      maybeSingle: vi.fn(() => Promise.resolve({ data: filtered[0] ?? null, error: null })),
      single: vi.fn(() => Promise.resolve({ data: filtered[0] ?? null, error: null }))
    }
    return builder
  }

  return {
    rows,
    select: vi.fn(() => createBuilder()),
    insert: vi.fn((payload: any) => {
      const record = { id: payload.id ?? `row-${rows.length + 1}`, ...payload }
      rows.push(record)
      return {
        select: () => ({
          single: vi.fn().mockResolvedValue({ data: record, error: null })
        })
      }
    })
  }
}

function buildEligibilitySupabaseStub(options: EligibilityOptions = {}) {
  const {
    progressPercentage = 100,
    bestScore = 80,
    existingRequest = false,
    hasCertificate = false,
    hasApprovedTcc = false
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
    certificate_requests: (() => {
      const table = createMutatingTable(
        existingRequest
          ? [{
              id: 'req-1',
              status: 'pending',
              certificate_type: 'technical',
              enrollment_id: 'enroll-1',
              request_date: new Date().toISOString()
            }]
          : []
      )
      return table
    })(),
    certificates: (() => {
      const table = createMutatingTable(
        hasCertificate
          ? [{
              id: 'cert-1',
              approval_status: 'approved',
              certificate_type: 'technical',
              enrollment_id: 'enroll-1',
              issued_at: new Date().toISOString()
            }]
          : []
      )
      return table
    })(),
    tcc_submissions: (() => {
      const table = createMutatingTable(
        hasApprovedTcc
          ? [{
              id: 'tcc-1',
              enrollment_id: 'enroll-1',
              status: 'approved'
            }]
          : []
      )
      return table
    })(),
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
    expect(payload.eligibleCertificates.technical).toBe(true)
    expect(payload.eligibleCertificates.latoSensu).toBe(false)
    expect(payload.hasApprovedTcc).toBe(false)
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
    expect(payload.eligibleCertificates.technical).toBe(false)
  })

  it('creates a certificate request via PUT when eligible', async () => {
    const eligibilityStub = buildEligibilitySupabaseStub({ progressPercentage: 100, bestScore: 90 })
    const requestStub = buildEligibilitySupabaseStub({ progressPercentage: 100, bestScore: 90 })

    createClientMock
      .mockResolvedValueOnce(requestStub.supabase as any)
      .mockResolvedValueOnce(eligibilityStub.supabase as any)

    const response = await PUT({
      json: vi.fn().mockResolvedValue({ courseId: 'course-1', enrollmentId: 'enroll-1', certificateType: 'technical' }),
      url: 'https://example.com/api/certificates/check-eligibility',
      headers: new Headers()
    } as any)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.certificateType).toBe('technical')
    expect(requestStub.tables.certificate_requests.insert).toHaveBeenCalledWith(
      expect.objectContaining({ certificate_type: 'technical' })
    )
    expect(requestStub.tables.activity_logs.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ certificate_type: 'technical' })
      })
    )
  })

  it('includes lato sensu eligibility when TCC is approved', async () => {
    const { supabase } = buildEligibilitySupabaseStub({ progressPercentage: 100, bestScore: 95, hasApprovedTcc: true })
    createClientMock.mockResolvedValue(supabase as any)

    const request = {
      json: vi.fn().mockResolvedValue({ courseId: 'course-1', enrollmentId: 'enroll-1' })
    } as any

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.eligibleCertificates.technical).toBe(true)
    expect(payload.eligibleCertificates.latoSensu).toBe(true)
    expect(payload.hasApprovedTcc).toBe(true)
  })

  it('rejects lato sensu requests when TCC is not approved', async () => {
    const eligibilityStub = buildEligibilitySupabaseStub({ progressPercentage: 100, bestScore: 90, hasApprovedTcc: false })
    const requestStub = buildEligibilitySupabaseStub({ progressPercentage: 100, bestScore: 90, hasApprovedTcc: false })

    createClientMock
      .mockResolvedValueOnce(requestStub.supabase as any)
      .mockResolvedValueOnce(eligibilityStub.supabase as any)

    const response = await PUT({
      json: vi.fn().mockResolvedValue({ courseId: 'course-1', enrollmentId: 'enroll-1', certificateType: 'lato-sensu' }),
      url: 'https://example.com/api/certificates/check-eligibility',
      headers: new Headers()
    } as any)

    expect(response.status).toBe(400)
    expect(requestStub.tables.certificate_requests.insert).not.toHaveBeenCalled()
  })

  it('allows lato sensu requests when TCC is approved', async () => {
    const eligibilityStub = buildEligibilitySupabaseStub({ progressPercentage: 100, bestScore: 90, hasApprovedTcc: true })
    const requestStub = buildEligibilitySupabaseStub({ progressPercentage: 100, bestScore: 90, hasApprovedTcc: true })

    createClientMock
      .mockResolvedValueOnce(requestStub.supabase as any)
      .mockResolvedValueOnce(eligibilityStub.supabase as any)

    const request = {
      json: vi.fn().mockResolvedValue({ courseId: 'course-1', enrollmentId: 'enroll-1', certificateType: 'lato-sensu' }),
      url: 'https://example.com/api/certificates/check-eligibility',
      headers: new Headers()
    } as any

    const response = await PUT(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.certificateType).toBe('lato-sensu')
    expect(requestStub.tables.certificate_requests.insert).toHaveBeenCalledWith(
      expect.objectContaining({ certificate_type: 'lato-sensu' })
    )
  })
})

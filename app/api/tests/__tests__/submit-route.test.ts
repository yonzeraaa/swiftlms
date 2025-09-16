import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

import { createClient } from '@/lib/supabase/server'
import { POST } from '../[id]/submit/route'

const createClientMock = vi.mocked(createClient)

interface SubmitStubOptions {
  enrollmentExists?: boolean
  totalLessons?: number
  completedLessons?: number
  previousAttempts?: number
  tccApproved?: boolean
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
      in: vi.fn(() => builder),
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

function buildSubmitSupabaseStub(options: SubmitStubOptions = {}) {
  const {
    enrollmentExists = true,
    totalLessons = 2,
    completedLessons = 2,
    previousAttempts = 0,
    tccApproved = false
  } = options

  const testRecord = {
    id: 'test-1',
    course_id: 'course-1',
    subject_id: 'subject-1',
    max_attempts: 3,
    passing_score: 70,
    is_active: true
  }

  const answerKeys = [
    { question_number: 1, correct_answer: 'A', points: 10 }
  ]

  const enrollment = enrollmentExists ? { id: 'enroll-1' } : null

  const testsTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: testRecord, error: null })
      }))
    }))
  }

  const answerKeysTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({ data: answerKeys, error: null })
      }))
    }))
  }

  const enrollmentsTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: enrollment, error: null })
        }))
      }))
    }))
  }

  const previousAttemptsResult = Array.from({ length: previousAttempts }).map((_, index) => ({ id: `attempt-${index}` }))

  const attemptsTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: previousAttemptsResult, error: null })
        }))
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { id: 'attempt-new' }, error: null })
      }))
    }))
  }

  const gradesTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        }))
      }))
    })),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockResolvedValue({ error: null })
  }

  const courseModulesTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: [{ id: 'module-1' }], error: null }))
    }))
  }

  const lessonsTable = {
    select: vi.fn(() => ({
      in: vi.fn(() => Promise.resolve({ count: totalLessons, error: null }))
    }))
  }

  const lessonProgressTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ count: completedLessons, error: null }))
      }))
    }))
  }

  const certificateRequestsTable = createMutatingTable([])

  const certificatesTable = createMutatingTable([])

  const tccSubmissionsTable = createMutatingTable(
    tccApproved
      ? [{
          id: 'tcc-1',
          enrollment_id: 'enroll-1',
          status: 'approved'
        }]
      : []
  )

  const activityLogsTable = {
    insert: vi.fn().mockResolvedValue({ error: null })
  }

  const tables: Record<string, any> = {
    tests: testsTable,
    test_answer_keys: answerKeysTable,
    enrollments: enrollmentsTable,
    test_attempts: attemptsTable,
    test_grades: gradesTable,
    course_modules: courseModulesTable,
    lessons: lessonsTable,
    lesson_progress: lessonProgressTable,
    certificate_requests: certificateRequestsTable,
    certificates: certificatesTable,
    tcc_submissions: tccSubmissionsTable,
    activity_logs: activityLogsTable
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
    attemptsTable,
    certificateRequestsTable,
    activityLogsTable
  }
}

describe('POST /api/tests/[id]/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates attempt, updates grade and auto requests certificate when eligible', async () => {
    const { supabase, certificateRequestsTable, activityLogsTable } = buildSubmitSupabaseStub()
    createClientMock.mockResolvedValue(supabase as any)

    const request = {
      json: vi.fn().mockResolvedValue({ answers: { '1': 'A' } })
    } as any

    const response = await POST(request, { params: Promise.resolve({ id: 'test-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.attempt.score).toBe(100)

    expect(certificateRequestsTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({ certificate_type: 'technical' })
    )
    expect(activityLogsTable.insert).toHaveBeenCalledWith(expect.objectContaining({
      action: expect.stringContaining('certificate')
    }))
  })

  it('creates lato sensu request when TCC is approved', async () => {
    const { supabase, certificateRequestsTable, activityLogsTable } = buildSubmitSupabaseStub({ tccApproved: true })
    createClientMock.mockResolvedValue(supabase as any)

    const request = {
      json: vi.fn().mockResolvedValue({ answers: { '1': 'A' } })
    } as any

    const response = await POST(request, { params: Promise.resolve({ id: 'test-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(certificateRequestsTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({ certificate_type: 'technical' })
    )
    expect(certificateRequestsTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({ certificate_type: 'lato-sensu' })
    )
    expect(activityLogsTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ certificate_type: 'technical' })
      })
    )
    expect(activityLogsTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ certificate_type: 'lato-sensu' })
      })
    )
  })

  it('returns 403 when user is not enrolled in the course', async () => {
    const { supabase, certificateRequestsTable } = buildSubmitSupabaseStub({ enrollmentExists: false })
    createClientMock.mockResolvedValue(supabase as any)

    const request = {
      json: vi.fn().mockResolvedValue({ answers: { '1': 'A' } })
    } as any

    const response = await POST(request, { params: Promise.resolve({ id: 'test-1' }) })
    expect(response.status).toBe(403)
    expect(certificateRequestsTable.insert).not.toHaveBeenCalled()
  })

  it('prevents submissions beyond max attempts', async () => {
    const { supabase } = buildSubmitSupabaseStub({ previousAttempts: 3 })
    createClientMock.mockResolvedValue(supabase as any)

    const request = {
      json: vi.fn().mockResolvedValue({ answers: { '1': 'A' } })
    } as any

    const response = await POST(request, { params: Promise.resolve({ id: 'test-1' }) })
    expect(response.status).toBe(400)
  })
})

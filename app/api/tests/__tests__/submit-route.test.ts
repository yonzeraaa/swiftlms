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
}

function buildSubmitSupabaseStub(options: SubmitStubOptions = {}) {
  const {
    enrollmentExists = true,
    totalLessons = 2,
    completedLessons = 2,
    previousAttempts = 0
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

  const certificateRequestsTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { id: 'cert-req-1' }, error: null })
      }))
    }))
  }

  const certificatesTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        }))
      }))
    }))
  }

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

    expect(certificateRequestsTable.insert).toHaveBeenCalled()
    expect(activityLogsTable.insert).toHaveBeenCalledWith(expect.objectContaining({
      action: expect.stringContaining('certificate')
    }))
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

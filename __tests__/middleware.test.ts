import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ensureUserEnrollmentForPreview } from '../middleware'

type CourseRecord = { id: string | null }
type EnrollmentRecord = { course_id: string | null }

declare module 'vitest' {
  interface TestContext {
    supabase: SupabaseStub
  }
}

class SupabaseStub {
  courses: CourseRecord[]
  enrollments: EnrollmentRecord[]
  insertSpy = vi.fn()

  constructor(courses: CourseRecord[], enrollments: EnrollmentRecord[]) {
    this.courses = courses
    this.enrollments = enrollments
  }

  from(table: string) {
    if (table === 'courses') {
      return {
        select: vi.fn().mockResolvedValue({ data: this.courses, error: null })
      }
    }

    if (table === 'enrollments') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: this.enrollments, error: null })
        })),
        insert: this.insertSpy.mockResolvedValue({ error: null })
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  }
}

describe('ensureUserEnrollmentForPreview', () => {
  const fixedDate = new Date('2025-01-01T00:00:00.000Z')

  beforeEach((ctx) => {
    vi.useFakeTimers()
    vi.setSystemTime(fixedDate)

    ctx.supabase = new SupabaseStub([], [])
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('does nothing when there are no courses', async ({ supabase }) => {
    await ensureUserEnrollmentForPreview(supabase as unknown as SupabaseClient<any>, 'admin-id')

    expect(supabase.insertSpy).not.toHaveBeenCalled()
  })

  it('enrolls user into missing courses', async () => {
    const supabase = new SupabaseStub(
      [
        { id: 'course-1' },
        { id: 'course-2' }
      ],
      [
        { course_id: 'course-1' }
      ]
    )

    await ensureUserEnrollmentForPreview(supabase as unknown as SupabaseClient<any>, 'admin-id')

    expect(supabase.insertSpy).toHaveBeenCalledWith([
      {
        course_id: 'course-2',
        enrolled_at: fixedDate.toISOString(),
        progress_percentage: 0,
        status: 'active',
        user_id: 'admin-id'
      }
    ])
  })
})

/**
 * Testes para o serviço de validação de notas
 */

import { validateGradeConsistency } from '../grade-validation'

// Mock do Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))

describe('validateGradeConsistency', () => {
  let mockSupabase: any

  beforeEach(async () => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn()
    }

    const supabaseModule = await import('@/lib/supabase/server')
    ;(supabaseModule.createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('deve validar dados consistentes com sucesso', async () => {
    mockSupabase.maybeSingle.mockResolvedValue({
      data: {
        user_id: 'user123',
        test_id: 'test123',
        best_score: 100,
        total_attempts: 3,
        last_attempt_date: '2025-01-01T12:00:00Z',
        course_id: 'course123',
        subject_id: 'subject123'
      },
      error: null
    })

    mockSupabase.select
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(mockSupabase)

    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockReturnValueOnce(mockSupabase)

    const attemptData = [
      { score: 80, submitted_at: '2025-01-01T10:00:00Z' },
      { score: 90, submitted_at: '2025-01-01T11:00:00Z' },
      { score: 100, submitted_at: '2025-01-01T12:00:00Z' }
    ]

    mockSupabase.from
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            user_id: 'user123',
            test_id: 'test123',
            best_score: 100,
            total_attempts: 3,
            last_attempt_date: '2025-01-01T12:00:00Z',
            course_id: 'course123',
            subject_id: 'subject123'
          }
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        data: attemptData
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'test123',
            course_id: 'course123',
            subject_id: 'subject123'
          }
        })
      })

    const result = await validateGradeConsistency('user123', 'test123')

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('deve detectar best_score inconsistente', async () => {
    mockSupabase.from
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            user_id: 'user123',
            test_id: 'test123',
            best_score: 80,
            total_attempts: 2,
            last_attempt_date: '2025-01-01T12:00:00Z',
            course_id: 'course123',
            subject_id: 'subject123'
          }
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        data: [
          { score: 90, submitted_at: '2025-01-01T11:00:00Z' },
          { score: 100, submitted_at: '2025-01-01T12:00:00Z' }
        ]
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'test123',
            course_id: 'course123',
            subject_id: 'subject123'
          }
        })
      })

    const result = await validateGradeConsistency('user123', 'test123')

    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]).toContain('best_score')
  })

  it('deve detectar total_attempts inconsistente', async () => {
    mockSupabase.from
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            user_id: 'user123',
            test_id: 'test123',
            best_score: 100,
            total_attempts: 5,
            last_attempt_date: '2025-01-01T12:00:00Z',
            course_id: 'course123',
            subject_id: 'subject123'
          }
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        data: [
          { score: 90, submitted_at: '2025-01-01T11:00:00Z' },
          { score: 100, submitted_at: '2025-01-01T12:00:00Z' }
        ]
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'test123',
            course_id: 'course123',
            subject_id: 'subject123'
          }
        })
      })

    const result = await validateGradeConsistency('user123', 'test123')

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('total_attempts'))).toBe(true)
  })

  it('deve detectar tentativas sem registro em test_grades', async () => {
    mockSupabase.from
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        data: [
          { score: 90, submitted_at: '2025-01-01T11:00:00Z' }
        ]
      })

    const result = await validateGradeConsistency('user123', 'test123')

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Existem tentativas mas nenhum registro em test_grades')
  })

  it('deve retornar detalhes completos da validação', async () => {
    mockSupabase.from
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            user_id: 'user123',
            test_id: 'test123',
            best_score: 100,
            total_attempts: 2,
            last_attempt_date: '2025-01-01T12:00:00Z',
            course_id: 'course123',
            subject_id: 'subject123'
          }
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        data: [
          { score: 90, submitted_at: '2025-01-01T11:00:00Z' },
          { score: 100, submitted_at: '2025-01-01T12:00:00Z' }
        ]
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'test123',
            course_id: 'course123',
            subject_id: 'subject123'
          }
        })
      })

    const result = await validateGradeConsistency('user123', 'test123')

    expect(result.details).toBeDefined()
    expect(result.details.testGradesBestScore).toBe(100)
    expect(result.details.maxAttemptScore).toBe(100)
    expect(result.details.testGradesTotalAttempts).toBe(2)
    expect(result.details.actualAttemptsCount).toBe(2)
  })
})

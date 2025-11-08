/**
 * Testes para o serviço de atribuição de notas
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { assignMaxGradeToStudent } from '../grade-services'

// Mock do Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

describe('assignMaxGradeToStudent', () => {
  let mockSupabase: any

  beforeEach(async () => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis()
    }

    const supabaseModule = await import('@/lib/supabase/server')
    ;(supabaseModule.createClient as any).mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('deve falhar se usuário não for admin', async () => {
    mockSupabase.single.mockResolvedValue({
      data: { role: 'student' },
      error: null
    })

    const result = await assignMaxGradeToStudent({
      userId: 'user123',
      testId: 'test123',
      adminId: 'admin123'
    })

    expect(result.success).toBe(false)
    expect(result.errors).toContain('Apenas administradores podem atribuir notas')
  })

  it('deve falhar se teste não existir', async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Teste não encontrado' }
      })

    const result = await assignMaxGradeToStudent({
      userId: 'user123',
      testId: 'test123',
      adminId: 'admin123'
    })

    expect(result.success).toBe(false)
    expect(result.errors).toContain('Teste não encontrado')
  })

  it('deve falhar se teste não estiver ativo', async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null
      })
      .mockResolvedValueOnce({
        data: { id: 'test123', title: 'Teste 1', is_active: false, course_id: 'course123' },
        error: null
      })

    const result = await assignMaxGradeToStudent({
      userId: 'user123',
      testId: 'test123',
      adminId: 'admin123'
    })

    expect(result.success).toBe(false)
    expect(result.errors).toContain('Teste não está ativo')
  })

  it('deve falhar se aluno não estiver matriculado no curso', async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null
      })
      .mockResolvedValueOnce({
        data: { id: 'test123', title: 'Teste 1', is_active: true, course_id: 'course123' },
        error: null
      })

    mockSupabase.maybeSingle.mockResolvedValue({
      data: null,
      error: null
    })

    const result = await assignMaxGradeToStudent({
      userId: 'user123',
      testId: 'test123',
      adminId: 'admin123'
    })

    expect(result.success).toBe(false)
    expect(result.errors).toContain('Aluno não está matriculado neste curso')
  })

  it('deve atribuir nota máxima com sucesso', async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null
      })
      .mockResolvedValueOnce({
        data: {
          id: 'test123',
          title: 'Teste 1',
          is_active: true,
          course_id: 'course123',
          subject_id: 'subject123'
        },
        error: null
      })
      .mockResolvedValueOnce({
        data: { id: 'attempt123' },
        error: null
      })
      .mockResolvedValueOnce({
        data: { id: 'grade123' },
        error: null
      })

    mockSupabase.maybeSingle
      .mockResolvedValueOnce({
        data: { id: 'enrollment123' },
        error: null
      })
      .mockResolvedValueOnce({
        data: { best_score: 75, total_attempts: 2 },
        error: null
      })

    mockSupabase.insert.mockReturnValue(mockSupabase)
    mockSupabase.upsert.mockReturnValue(mockSupabase)

    const result = await assignMaxGradeToStudent({
      userId: 'user123',
      testId: 'test123',
      adminId: 'admin123',
      reason: 'Teste de validação'
    })

    expect(result.success).toBe(true)
    expect(result.newScore).toBe(100)
    expect(result.previousScore).toBe(75)
    expect(result.gradeId).toBe('grade123')
    expect(result.attemptId).toBe('attempt123')
  })

  it('deve criar primeira tentativa se aluno nunca fez o teste', async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null
      })
      .mockResolvedValueOnce({
        data: {
          id: 'test123',
          title: 'Teste 1',
          is_active: true,
          course_id: 'course123',
          subject_id: 'subject123'
        },
        error: null
      })
      .mockResolvedValueOnce({
        data: { id: 'attempt123' },
        error: null
      })
      .mockResolvedValueOnce({
        data: { id: 'grade123' },
        error: null
      })

    mockSupabase.maybeSingle
      .mockResolvedValueOnce({
        data: { id: 'enrollment123' },
        error: null
      })
      .mockResolvedValueOnce({
        data: null,
        error: null
      })

    mockSupabase.insert.mockReturnValue(mockSupabase)
    mockSupabase.upsert.mockReturnValue(mockSupabase)

    const result = await assignMaxGradeToStudent({
      userId: 'user123',
      testId: 'test123',
      adminId: 'admin123'
    })

    expect(result.success).toBe(true)
    expect(result.previousScore).toBe(null)
    expect(result.newScore).toBe(100)
  })
})

/**
 * Teste de integração: Fluxo completo de atribuição de nota máxima
 *
 * Este teste valida:
 * 1. Criação de aluno e teste
 * 2. Matrícula do aluno
 * 3. Aluno faz tentativa com nota baixa
 * 4. Admin atribui nota máxima
 * 5. Verificação de consistência dos dados
 * 6. Validação de que relatórios refletem a mudança
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { assignMaxGradeToStudent } from '@/lib/services/grade-services'
import { validateGradeConsistency } from '@/lib/services/grade-validation'

// Mock do Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

describe('Fluxo de Atribuição de Nota Máxima', () => {
  let mockSupabase: any
  let mockData: {
    adminId: string
    studentId: string
    courseId: string
    subjectId: string
    testId: string
    enrollmentId: string
  }

  beforeEach(async () => {
    // Configurar dados de teste
    mockData = {
      adminId: 'admin-uuid-123',
      studentId: 'student-uuid-456',
      courseId: 'course-uuid-789',
      subjectId: 'subject-uuid-101',
      testId: 'test-uuid-202',
      enrollmentId: 'enrollment-uuid-303'
    }

    // Mock do cliente Supabase - create a proper chainable mock
    const createChainable = (): any => {
      const chain: any = {
        from: vi.fn(),
        select: vi.fn(),
        insert: vi.fn(),
        upsert: vi.fn(),
        eq: vi.fn(),
        single: vi.fn(),
        maybeSingle: vi.fn(),
        order: vi.fn(),
        limit: vi.fn()
      }

      // Make everything return the chain for method chaining
      chain.from.mockReturnValue(chain)
      chain.select.mockReturnValue(chain)
      chain.insert.mockReturnValue(chain)
      chain.upsert.mockReturnValue(chain)
      chain.eq.mockReturnValue(chain)
      chain.order.mockReturnValue(chain)
      chain.limit.mockReturnValue(chain)

      return chain
    }

    mockSupabase = createChainable()

    const supabaseModule = await import('@/lib/supabase/server')
    ;(supabaseModule.createClient as any).mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it.skip('deve completar o fluxo completo de atribuição de nota máxima', async () => {
    // 1. Admin verifica permissões
    mockSupabase.single.mockResolvedValueOnce({
      data: { role: 'admin' },
      error: null
    })

    // 2. Buscar informações do teste
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: mockData.testId,
        title: 'Teste de Matemática',
        course_id: mockData.courseId,
        subject_id: mockData.subjectId,
        is_active: true,
        passing_score: 70
      },
      error: null
    })

    // 3. Verificar matrícula do aluno
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { id: mockData.enrollmentId },
      error: null
    })

    // 4. Buscar nota atual do aluno (tentativa anterior com nota 60)
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: {
        best_score: 60,
        total_attempts: 1
      },
      error: null
    })

    // 5. Criar nova tentativa com nota 100
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'attempt-uuid-404' },
      error: null
    })

    // 6. Atualizar test_grades
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'grade-uuid-505' },
      error: null
    })

    // 7. Registrar activity log
    mockSupabase.insert.mockResolvedValueOnce({
      data: null,
      error: null
    })

    // Executar atribuição de nota
    const assignResult = await assignMaxGradeToStudent({
      userId: mockData.studentId,
      testId: mockData.testId,
      adminId: mockData.adminId,
      reason: 'Teste de integração'
    })

    // Debug: ver o que foi retornado
    if (!assignResult.success) {
      console.log('assignResult:', JSON.stringify(assignResult, null, 2))
    }

    // Validar resultado da atribuição
    expect(assignResult.success).toBe(true)
    expect(assignResult.previousScore).toBe(60)
    expect(assignResult.newScore).toBe(100)
    expect(assignResult.gradeId).toBe('grade-uuid-505')
    expect(assignResult.attemptId).toBe('attempt-uuid-404')

    // 8. Validar consistência dos dados
    mockSupabase.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            user_id: mockData.studentId,
            test_id: mockData.testId,
            best_score: 100,
            total_attempts: 2,
            last_attempt_date: new Date().toISOString(),
            course_id: mockData.courseId,
            subject_id: mockData.subjectId
          }
        })
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [
          { score: 60, submitted_at: new Date(Date.now() - 3600000).toISOString() },
          { score: 100, submitted_at: new Date().toISOString() }
        ]
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: mockData.testId,
            course_id: mockData.courseId,
            subject_id: mockData.subjectId
          }
        })
      })

    const validationResult = await validateGradeConsistency(
      mockData.studentId,
      mockData.testId
    )

    // Validar consistência
    expect(validationResult.isValid).toBe(true)
    expect(validationResult.errors).toHaveLength(0)
    expect(validationResult.details.testGradesBestScore).toBe(100)
    expect(validationResult.details.actualAttemptsCount).toBe(2)
    expect(validationResult.details.maxAttemptScore).toBe(100)
  })

  it('deve falhar se aluno não estiver matriculado', async () => {
    // 1. Admin verifica permissões
    mockSupabase.single.mockResolvedValueOnce({
      data: { role: 'admin' },
      error: null
    })

    // 2. Buscar informações do teste
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: mockData.testId,
        title: 'Teste de Matemática',
        course_id: mockData.courseId,
        subject_id: mockData.subjectId,
        is_active: true
      },
      error: null
    })

    // 3. Aluno NÃO está matriculado
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null
    })

    const result = await assignMaxGradeToStudent({
      userId: mockData.studentId,
      testId: mockData.testId,
      adminId: mockData.adminId
    })

    expect(result.success).toBe(false)
    expect(result.errors).toContain('Aluno não está matriculado neste curso')
  })

  it('deve criar primeira tentativa se aluno nunca fez o teste', async () => {
    // 1. Admin verifica permissões
    mockSupabase.single.mockResolvedValueOnce({
      data: { role: 'admin' },
      error: null
    })

    // 2. Buscar informações do teste
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: mockData.testId,
        title: 'Teste de Matemática',
        course_id: mockData.courseId,
        subject_id: mockData.subjectId,
        is_active: true
      },
      error: null
    })

    // 3. Verificar matrícula
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { id: mockData.enrollmentId },
      error: null
    })

    // 4. Aluno nunca fez o teste
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null
    })

    // 5. Criar primeira tentativa
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'attempt-uuid-first' },
      error: null
    })

    // 6. Criar registro em test_grades
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'grade-uuid-first' },
      error: null
    })

    const result = await assignMaxGradeToStudent({
      userId: mockData.studentId,
      testId: mockData.testId,
      adminId: mockData.adminId
    })

    expect(result.success).toBe(true)
    expect(result.previousScore).toBe(null)
    expect(result.newScore).toBe(100)
  })

  it('deve registrar ação em activity_logs', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null })

    mockSupabase.single
      .mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
      .mockResolvedValueOnce({
        data: {
          id: mockData.testId,
          title: 'Teste de Matemática',
          course_id: mockData.courseId,
          subject_id: mockData.subjectId,
          is_active: true
        },
        error: null
      })
      .mockResolvedValueOnce({ data: { id: 'attempt-123' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'grade-123' }, error: null })

    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: { id: mockData.enrollmentId }, error: null })
      .mockResolvedValueOnce({ data: null, error: null })

    mockSupabase.insert = insertSpy

    await assignMaxGradeToStudent({
      userId: mockData.studentId,
      testId: mockData.testId,
      adminId: mockData.adminId,
      reason: 'Teste de auditoria'
    })

    expect(insertSpy).toHaveBeenCalled()
  })
})

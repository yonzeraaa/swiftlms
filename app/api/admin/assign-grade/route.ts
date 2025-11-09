import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import { assignMaxGradeToStudent } from '@/lib/services/grade-services'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas administradores podem atribuir notas' },
        { status: 403 }
      )
    }

    // Validar body
    const body = await request.json()
    const { userId, testId, reason } = body

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId é obrigatório e deve ser uma string' },
        { status: 400 }
      )
    }

    if (!testId || typeof testId !== 'string') {
      return NextResponse.json(
        { error: 'testId é obrigatório e deve ser uma string' },
        { status: 400 }
      )
    }

    // Atribuir nota máxima
    const result = await assignMaxGradeToStudent({
      userId,
      testId,
      adminId: user.id,
      reason
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.errors?.join(', ') || 'Erro ao atribuir nota' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          previousScore: result.previousScore,
          newScore: result.newScore,
          gradeId: result.gradeId,
          attemptId: result.attemptId
        }
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Erro ao atribuir nota:', error, { context: 'ADMIN' })
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

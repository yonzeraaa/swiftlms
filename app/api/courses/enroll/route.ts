import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticação
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Não autenticado. Por favor, faça login novamente.' },
        { status: 401 }
      )
    }

    const { courseId, studentIds } = await request.json()

    if (!courseId || !studentIds || !Array.isArray(studentIds)) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    console.log('[API] Matriculando alunos:', {
      courseId,
      studentCount: studentIds.length,
      userId: session.user.id
    })

    // Criar matrículas
    const enrollments = studentIds.map((studentId: string) => ({
      course_id: courseId,
      user_id: studentId,
      status: 'active',
      enrolled_at: new Date().toISOString()
    }))

    const { data, error } = await supabase
      .from('enrollments')
      .insert(enrollments)
      .select()

    if (error) {
      console.error('[API] Erro ao criar matrículas:', error)
      
      // Verificar se é erro de duplicata
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Alguns alunos já estão matriculados neste curso' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Registrar atividade
    await supabase
      .from('activity_logs')
      .insert({
        user_id: session.user.id,
        action: 'enroll_students',
        entity_type: 'course',
        entity_id: courseId,
        entity_name: `${studentIds.length} alunos`,
        metadata: { studentIds, enrollmentCount: data.length }
      })

    return NextResponse.json({
      success: true,
      enrollments: data,
      message: `${data.length} aluno(s) matriculado(s) com sucesso`
    })
  } catch (error: any) {
    console.error('[API] Erro inesperado:', error)
    return NextResponse.json(
      { error: 'Erro ao processar matrícula. Tente novamente.' },
      { status: 500 }
    )
  }
}
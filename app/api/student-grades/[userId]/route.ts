import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient()
    const { userId } = await params

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

    // Buscar perfil do usuário autenticado
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!currentUserProfile) {
      return NextResponse.json(
        { error: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    // Validar permissão: admin pode ver qualquer aluno, aluno só pode ver suas próprias notas
    const isAdmin = currentUserProfile.role === 'admin'
    const isOwnGrades = user.id === userId

    if (!isAdmin && !isOwnGrades) {
      return NextResponse.json(
        { error: 'Você não tem permissão para visualizar estas notas' },
        { status: 403 }
      )
    }

    // Validar que o userId existe
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', userId)
      .single()

    if (!studentProfile) {
      return NextResponse.json(
        { error: 'Aluno não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se é um aluno
    if (studentProfile.role !== 'student') {
      return NextResponse.json(
        { error: 'O usuário especificado não é um aluno' },
        { status: 400 }
      )
    }

    // Extrair filtros de query params
    const searchParams = request.nextUrl.searchParams
    const dateStart = searchParams.get('dateStart')
    const dateEnd = searchParams.get('dateEnd')

    // Retornar sucesso com dados de validação
    return NextResponse.json({
      success: true,
      data: {
        userId: studentProfile.id,
        userName: studentProfile.full_name || studentProfile.email,
        canEdit: isAdmin,
        filters: {
          dateStart: dateStart || null,
          dateEnd: dateEnd || null
        }
      }
    })
  } catch (error) {
    console.error('Erro ao validar acesso às notas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

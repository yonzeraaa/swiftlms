import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado. Faça login novamente.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { newPassword } = body

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'Nova senha é obrigatória' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Atualizar senha
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      console.error('Erro ao atualizar senha:', updateError)

      // Mapear erros comuns do Supabase para mensagens amigáveis
      if (updateError.message.includes('same password')) {
        return NextResponse.json(
          { error: 'A nova senha não pode ser igual à senha atual' },
          { status: 400 }
        )
      }

      if (updateError.message.includes('weak')) {
        return NextResponse.json(
          { error: 'A senha é muito fraca. Use letras, números e caracteres especiais.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: updateError.message || 'Erro ao alterar senha' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso'
    })
  } catch (error) {
    console.error('Erro ao processar alteração de senha:', error)
    return NextResponse.json(
      { error: 'Erro interno ao processar solicitação' },
      { status: 500 }
    )
  }
}

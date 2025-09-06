import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { access_token, refresh_token } = await request.json()
    
    if (!access_token || !refresh_token) {
      // Tentar pegar do localStorage via cliente
      return NextResponse.json({
        error: 'Tokens não fornecidos. Use a página de debug para sincronizar.'
      }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    // Tentar definir a sessão com os tokens fornecidos
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token
    })
    
    if (error) {
      return NextResponse.json({
        error: `Erro ao definir sessão: ${error.message}`
      }, { status: 500 })
    }
    
    if (!data.session) {
      return NextResponse.json({
        error: 'Sessão não foi criada'
      }, { status: 500 })
    }
    
    // Forçar definição de cookies
    const cookieStore = await cookies()
    const cookieOptions = {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      httpOnly: true,
      maxAge: 60 * 60 * 3 // 3 horas
    }
    
    // Cookie principal do Supabase
    const supabaseKey = `sb-mdzgnktlsmkjecdbermo-auth-token`
    cookieStore.set({
      name: supabaseKey,
      value: JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type,
        user: data.session.user
      }),
      ...cookieOptions
    })
    
    // Cookies auxiliares
    cookieStore.set({
      name: 'sb-access-token',
      value: data.session.access_token,
      ...cookieOptions
    })
    
    cookieStore.set({
      name: 'sb-refresh-token',
      value: data.session.refresh_token,
      ...cookieOptions
    })
    
    return NextResponse.json({
      success: true,
      message: 'Sessão sincronizada com sucesso!',
      session: {
        userId: data.session.user.id,
        email: data.session.user.email,
        expiresAt: data.session.expires_at
      }
    })
    
  } catch (error: any) {
    console.error('[SYNC-SESSION] Erro:', error)
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}
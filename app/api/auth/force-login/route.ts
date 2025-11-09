import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Fazer login direto com credenciais admin
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@swiftedu.com',
      password: 'admin@123'
    })
    
    if (error) {
      return NextResponse.json({
        error: `Erro no login: ${error.message}`
      }, { status: 401 })
    }
    
    if (!data.session) {
      return NextResponse.json({
        error: 'Login realizado mas sem sessão'
      }, { status: 500 })
    }
    
    // Forçar configuração de cookies
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
    
    // Cookies adicionais para garantir
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
      message: 'Login forçado realizado com sucesso',
      session: {
        userId: data.session.user.id,
        email: data.session.user.email,
        expiresAt: data.session.expires_at
      }
    })
  } catch (error: any) {
    logger.error('[FORCE-LOGIN] Erro:', error, { context: 'AUTH' })
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}
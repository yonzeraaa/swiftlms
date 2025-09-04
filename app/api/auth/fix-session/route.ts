import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Tentar várias estratégias para recuperar/criar sessão
    
    // 1. Primeiro, tentar obter sessão atual
    let { data: { session }, error } = await supabase.auth.getSession()
    
    if (!session) {
      console.log('[FIX-SESSION] Sem sessão, tentando recuperar...')
      
      // 2. Tentar fazer refresh
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshData?.session) {
        session = refreshData.session
        console.log('[FIX-SESSION] Sessão recuperada via refresh')
      } else {
        console.log('[FIX-SESSION] Refresh falhou:', refreshError?.message)
        
        // 3. Tentar login com credenciais padrão (apenas para teste)
        const { email, password } = await request.json()
        
        if (email && password) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          })
          
          if (signInData?.session) {
            session = signInData.session
            console.log('[FIX-SESSION] Nova sessão criada via login')
          } else {
            return NextResponse.json({
              error: `Falha no login: ${signInError?.message}`
            }, { status: 401 })
          }
        } else {
          return NextResponse.json({
            error: 'Sem sessão e sem credenciais fornecidas'
          }, { status: 401 })
        }
      }
    }
    
    // 4. Se temos sessão, garantir que cookies estão configurados
    if (session) {
      const cookieStore = await cookies()
      
      // Configurar cookies essenciais
      const cookieOptions = {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7 // 7 dias
      }
      
      // Salvar tokens em cookies
      cookieStore.set({
        name: 'sb-access-token',
        value: session.access_token,
        ...cookieOptions
      })
      
      cookieStore.set({
        name: 'sb-refresh-token',
        value: session.refresh_token,
        ...cookieOptions
      })
      
      // Também salvar o cookie principal do Supabase
      const supabaseKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '')}-auth-token`
      cookieStore.set({
        name: supabaseKey,
        value: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          expires_in: session.expires_in,
          token_type: session.token_type,
          user: session.user
        }),
        ...cookieOptions
      })
      
      return NextResponse.json({
        success: true,
        message: 'Sessão corrigida com sucesso',
        session: {
          userId: session.user.id,
          email: session.user.email,
          expiresAt: session.expires_at
        }
      })
    }
    
    return NextResponse.json({
      error: 'Não foi possível estabelecer sessão'
    }, { status: 500 })
    
  } catch (error: any) {
    console.error('[FIX-SESSION] Erro:', error)
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}
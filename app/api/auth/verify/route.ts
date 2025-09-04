import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Tentar obter sessão de várias formas
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Se temos usuário mas não sessão, tentar refresh
    let refreshAttempted = false
    let refreshSuccess = false
    
    if (user && !session) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      refreshAttempted = true
      refreshSuccess = !!refreshData.session
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      hasSession: !!session,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      sessionError: sessionError?.message,
      userError: userError?.message,
      refreshAttempted,
      refreshSuccess,
      path: request.nextUrl.pathname,
      middleware: {
        shouldBlockDashboard: !session && (
          request.nextUrl.pathname.startsWith('/dashboard') || 
          request.nextUrl.pathname.startsWith('/student-dashboard')
        ),
        shouldRedirectFromLogin: !!session && request.nextUrl.pathname === '/'
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}
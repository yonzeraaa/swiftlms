import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const cookieStore = await cookies()
    
    // Get all auth-related cookies
    const allCookies = cookieStore.getAll()
    const authCookies = allCookies.filter(c => 
      c.name.includes('sb-') || 
      c.name.includes('auth') || 
      c.name.includes('supabase')
    )
    
    // Try to get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    // Try to get user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Check if we can refresh
    let refreshAttempt = null
    if (!session) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      refreshAttempt = {
        success: !!refreshData.session,
        error: refreshError?.message
      }
    }
    
    // Get profile if user exists
    let profile = null
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      profile = data
    }
    
    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        host: request.headers.get('host'),
        origin: request.headers.get('origin'),
        userAgent: request.headers.get('user-agent')
      },
      cookies: {
        total: allCookies.length,
        authCookies: authCookies.map(c => ({
          name: c.name,
          hasValue: !!c.value,
          length: c.value?.length || 0
        }))
      },
      auth: {
        hasSession: !!session,
        hasUser: !!user,
        sessionError: sessionError?.message,
        userError: userError?.message,
        userId: user?.id,
        userEmail: user?.email,
        userRole: user?.role,
        sessionExpiresAt: session?.expires_at,
        refreshAttempt
      },
      profile: profile ? {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        full_name: profile.full_name
      } : null,
      checks: {
        isAuthenticated: !!session && !!user,
        hasValidSession: !!session && session.expires_at && new Date(session.expires_at * 1000) > new Date(),
        hasProfile: !!profile,
        canAccessDashboard: !!session && !!user && !!profile
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'ERROR',
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
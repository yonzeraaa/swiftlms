import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    // Filter Supabase cookies
    const supabaseCookies = allCookies.filter(c => c.name.startsWith('sb-'))
    
    const supabase = await createClient()
    
    // Try to get user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Try to get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    return NextResponse.json({
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
        ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing'
      },
      cookies: {
        total: allCookies.length,
        supabase: supabaseCookies.length,
        names: supabaseCookies.map(c => ({
          name: c.name,
          hasValue: !!c.value
        }))
      },
      auth: {
        user: user ? {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        } : null,
        userError: userError?.message,
        session: session ? {
          hasAccessToken: !!session.access_token,
          hasRefreshToken: !!session.refresh_token,
          expires_at: session.expires_at,
          expires_in: session.expires_in
        } : null,
        sessionError: sessionError?.message
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug endpoint error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
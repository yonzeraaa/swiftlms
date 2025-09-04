import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const cookieStore = await cookies()
    
    // Get session from Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    // Get all cookies for debugging
    const allCookies = cookieStore.getAll()
    const authCookies = allCookies.filter(c => 
      c.name.includes('sb-') || 
      c.name.includes('auth') || 
      c.name.includes('refresh') ||
      c.name.includes('viewAsStudent') ||
      c.name.includes('adminView')
    )
    
    // Get user profile if session exists
    let profile = null
    if (session?.user?.id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      profile = profileData
    }
    
    // Prepare debug info
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        COOKIE_DOMAIN: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
      },
      session: {
        exists: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        expiresAt: session?.expires_at,
        expiresIn: session?.expires_at 
          ? Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000) + ' seconds'
          : null,
        accessToken: session?.access_token ? 'Present (hidden)' : 'Missing',
        refreshToken: session?.refresh_token ? 'Present (hidden)' : 'Missing'
      },
      profile: profile ? {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        full_name: profile.full_name
      } : null,
      cookies: {
        count: authCookies.length,
        present: authCookies.map(c => ({
          name: c.name,
          hasValue: !!c.value
        }))
      },
      sessionError: sessionError?.message || null
    }
    
    return NextResponse.json(debugInfo, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    console.error('[SESSION-DEBUG] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get session debug info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get cookies
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    // Get session
    const { data: { session }, error } = await supabase.auth.getSession()
    
    // Get user
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check localStorage key
    const storageKey = `sb-mdzgnktlsmkjecdbermo-auth-token`
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_COOKIE_DOMAIN: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
        hostname: request.headers.get('host'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
      },
      cookies: {
        count: allCookies.length,
        authCookies: allCookies.filter(c => 
          c.name.includes('sb-') || 
          c.name.includes('auth') || 
          c.name.includes('supabase')
        ).map(c => ({
          name: c.name,
          value: c.value ? `${c.value.substring(0, 20)}...` : 'empty'
        })),
        allCookieNames: allCookies.map(c => c.name)
      },
      session: {
        exists: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        expiresAt: session?.expires_at,
        error: error?.message
      },
      user: {
        exists: !!user,
        id: user?.id,
        email: user?.email
      },
      localStorage: {
        expectedKey: storageKey,
        instruction: `Check browser console: localStorage.getItem('${storageKey}')`
      },
      headers: {
        cookie: request.headers.get('cookie')?.substring(0, 100) + '...',
        userAgent: request.headers.get('user-agent')
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
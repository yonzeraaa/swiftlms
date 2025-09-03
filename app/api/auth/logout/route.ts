import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Supabase signOut error:', error)
      // Continue with cleanup even if signOut fails
    }
    
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    // Create a JSON response with clear storage flag
    const response = NextResponse.json({ 
      success: true,
      clearStorage: true,
      redirect: '/'
    })
    
    // Clear all Supabase-related cookies and admin view mode cookies
    allCookies.forEach(cookie => {
      if (cookie.name.startsWith('sb-') || 
          cookie.name.includes('supabase') ||
          cookie.name.includes('auth-token') ||
          cookie.name === 'viewAsStudent' ||
          cookie.name === 'isAdminViewMode') {
        response.cookies.set({
          name: cookie.name,
          value: '',
          expires: new Date(0),
          maxAge: 0,
          path: '/',
          // Domain not set - let browser handle it
          sameSite: 'lax',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production'
        })
      }
    })
    
    // Also try to clear cookies with project-specific prefix and admin view mode cookies
    const projectId = 'mdzgnktlsmkjecdbermo'
    const cookieNames = [
      'sb-access-token', 
      'sb-refresh-token', 
      'sb-auth-token',
      `sb-${projectId}-auth-token`,
      `sb-${projectId}-auth-token.0`,
      `sb-${projectId}-auth-token.1`,
      'viewAsStudent',
      'isAdminViewMode'
    ]
    const paths = ['/']
    
    cookieNames.forEach(name => {
      paths.forEach(path => {
        response.cookies.set({
          name,
          value: '',
          expires: new Date(0),
          maxAge: 0,
          path,
          // Domain not set - let browser handle it
          sameSite: 'lax',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production'
        })
      })
    })
    
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ 
      error: 'Logout failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
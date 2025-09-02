import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
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
    
    const response = NextResponse.json({ 
      success: true,
      clearStorage: true // Signal to client to clear localStorage
    })
    
    // Clear all Supabase-related cookies
    allCookies.forEach(cookie => {
      if (cookie.name.startsWith('sb-') || 
          cookie.name.includes('supabase') ||
          cookie.name.includes('auth-token')) {
        response.cookies.set({
          name: cookie.name,
          value: '',
          expires: new Date(0),
          maxAge: 0,
          path: '/',
          domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined,
          sameSite: 'lax',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production'
        })
      }
    })
    
    // Also try to clear with different path variations
    const cookieNames = ['sb-access-token', 'sb-refresh-token', 'sb-auth-token']
    const paths = ['/', '/dashboard', '/student-dashboard']
    
    cookieNames.forEach(name => {
      paths.forEach(path => {
        response.cookies.set({
          name,
          value: '',
          expires: new Date(0),
          maxAge: 0,
          path,
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
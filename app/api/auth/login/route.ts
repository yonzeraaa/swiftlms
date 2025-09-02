import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      console.error('Login error:', error)
      return NextResponse.json(
        { 
          error: error.message,
          code: error.status 
        },
        { status: 401 }
      )
    }
    
    if (!data.user) {
      return NextResponse.json(
        { error: 'Login failed - no user data returned' },
        { status: 401 }
      )
    }
    
    // Get user profile to determine redirect
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()
    
    if (profileError) {
      console.error('Profile fetch error:', profileError)
    }
    
    // Verify session was created
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      console.error('Session verification failed:', sessionError)
      return NextResponse.json(
        { error: 'Failed to establish session' },
        { status: 500 }
      )
    }
    
    // Create response with proper redirect URL
    const redirectUrl = profile?.role === 'student' 
      ? '/student-dashboard' 
      : '/dashboard'
    
    const response = NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile?.role || 'student'
      },
      redirectUrl
    })
    
    // Ensure cookies are set properly for production
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    // Re-set Supabase cookies with proper settings for production
    allCookies.forEach(cookie => {
      if (cookie.name.startsWith('sb-')) {
        response.cookies.set({
          name: cookie.name,
          value: cookie.value,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7 // 7 days
        })
      }
    })
    
    return response
  } catch (error) {
    console.error('Unexpected login error:', error)
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
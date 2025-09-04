import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Verify user is admin or instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
    
    // Get cookies store
    const cookieStore = await cookies()
    
    // Set multiple cookies for redundancy - NO domain specified
    const cookieOptions = {
      maxAge: 3600, // 1 hour
      path: '/',
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false // Allow client-side access
      // NO domain - let browser handle it for current domain
    }
    
    // Set the main view cookie
    cookieStore.set('viewAsStudent', 'true', cookieOptions)
    
    // Set backup indicator cookie
    cookieStore.set('isAdminViewMode', 'true', cookieOptions)
    
    // Also set admin ID for verification
    cookieStore.set('adminViewId', user.id, {
      ...cookieOptions,
      httpOnly: true // This one should be httpOnly for security
    })
    
    // Log for debugging
    console.log('[VIEW-AS-STUDENT] Cookies set for user:', user.id)
    
    // Return success with delay instruction
    return NextResponse.json({ 
      success: true,
      redirect: '/student-dashboard',
      delay: 100, // Tell frontend to wait 100ms
      cookiesSet: ['viewAsStudent', 'isAdminViewMode', 'adminViewId']
    })
    
  } catch (error) {
    console.error('Error setting view as student mode:', error)
    return NextResponse.json({ 
      error: 'Failed to set view mode',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get cookies store
    const cookieStore = await cookies()
    
    // Clear all view-related cookies
    const cookiesToClear = ['viewAsStudent', 'isAdminViewMode', 'adminViewId']
    
    cookiesToClear.forEach(cookieName => {
      cookieStore.set(cookieName, '', {
        expires: new Date(0),
        maxAge: 0,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: false
        // NO domain - let browser handle it
      })
    })
    
    // Log for debugging
    console.log('[VIEW-AS-STUDENT] Cookies cleared')
    
    // Return success with delay
    return NextResponse.json({ 
      success: true,
      redirect: '/dashboard',
      delay: 100, // Tell frontend to wait
      cookiesCleared: cookiesToClear
    })
    
  } catch (error) {
    console.error('Error clearing view mode:', error)
    return NextResponse.json({ 
      error: 'Failed to clear view mode',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
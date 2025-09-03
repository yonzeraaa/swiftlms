import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    
    // Create response with redirect
    const response = NextResponse.json({ 
      success: true,
      redirect: '/student-dashboard' 
    })
    
    // Set the viewAsStudent cookie properly
    response.cookies.set({
      name: 'viewAsStudent',
      value: 'true',
      maxAge: 3600, // 1 hour
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false // Allow client-side access for UI updates
    })
    
    return response
    
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
    // Create response
    const response = NextResponse.json({ 
      success: true,
      redirect: '/dashboard' 
    })
    
    // Clear both cookies
    response.cookies.set({
      name: 'viewAsStudent',
      value: '',
      expires: new Date(0),
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false
    })
    
    response.cookies.set({
      name: 'isAdminViewMode',
      value: '',
      expires: new Date(0),
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false
    })
    
    return response
    
  } catch (error) {
    console.error('Error clearing view mode:', error)
    return NextResponse.json({ 
      error: 'Failed to clear view mode',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
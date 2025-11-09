import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient()
    
    // Get user info
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get user profile
    let profile = null
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      profile = data
    }
    
    // Get all cookies
    const allCookies = cookieStore.getAll()
    
    // Check view mode cookies specifically
    const viewAsStudent = cookieStore.get('viewAsStudent')
    const isAdminViewMode = cookieStore.get('isAdminViewMode')
    const adminViewId = cookieStore.get('adminViewId')
    
    // Check from request cookies too (for debugging)
    const requestViewAsStudent = request.cookies.get('viewAsStudent')
    const requestIsAdminViewMode = request.cookies.get('isAdminViewMode')
    const requestAdminViewId = request.cookies.get('adminViewId')
    
    // Build debug info
    const debugInfo = {
      timestamp: new Date().toISOString(),
      user: {
        authenticated: !!user,
        id: user?.id,
        email: user?.email,
        role: profile?.role
      },
      viewModeCookies: {
        // From cookie store (server)
        server: {
          viewAsStudent: viewAsStudent ? { value: viewAsStudent.value, exists: true } : { exists: false },
          isAdminViewMode: isAdminViewMode ? { value: isAdminViewMode.value, exists: true } : { exists: false },
          adminViewId: adminViewId ? { value: adminViewId.value, exists: true } : { exists: false }
        },
        // From request (what middleware sees)
        request: {
          viewAsStudent: requestViewAsStudent ? { value: requestViewAsStudent.value, exists: true } : { exists: false },
          isAdminViewMode: requestIsAdminViewMode ? { value: requestIsAdminViewMode.value, exists: true } : { exists: false },
          adminViewId: requestAdminViewId ? { value: requestAdminViewId.value, exists: true } : { exists: false }
        }
      },
      allCookies: {
        count: allCookies.length,
        names: allCookies.map(c => c.name)
      },
      viewModeStatus: {
        shouldHaveAccess: !!(viewAsStudent?.value === 'true' || isAdminViewMode?.value === 'true' || adminViewId?.value === user?.id),
        isAdmin: profile?.role === 'admin',
        isInstructor: profile?.role === 'instructor',
        canUseViewMode: profile?.role === 'admin' || profile?.role === 'instructor'
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        url: request.url,
        pathname: request.nextUrl.pathname
      }
    }
    
    return NextResponse.json(debugInfo, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    })
    
  } catch (error) {
    logger.error('Check view mode error:', error, { context: 'AUTH' })
    return NextResponse.json({
      error: 'Failed to check view mode',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { logger } from '@/lib/utils/logger'
import { validateCSRF, createCSRFError } from '@/lib/security/csrf'

export async function POST(request: NextRequest) {
  try {
    // Validar CSRF
    if (!await validateCSRF(request)) {
      logger.warn('CSRF validation failed', undefined, { context: 'VIEW_AS_STUDENT' })
      return createCSRFError()
    }

    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      logger.warn('Unauthenticated view-as-student attempt', undefined, { context: 'VIEW_AS_STUDENT' })
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verify user is admin or instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      logger.warn('Unauthorized view-as-student attempt', { userId: user.id, userRole: profile?.role }, { context: 'VIEW_AS_STUDENT' })
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

    logger.info('View-as-student mode activated', { userId: user.id, userRole: profile.role }, { context: 'VIEW_AS_STUDENT' })

    // Return success with delay instruction
    return NextResponse.json({
      success: true,
      redirect: '/student-dashboard',
      delay: 100,
      cookiesSet: ['viewAsStudent', 'isAdminViewMode', 'adminViewId']
    })

  } catch (error) {
    logger.error('Error setting view as student mode', error, { context: 'VIEW_AS_STUDENT' })
    return NextResponse.json({
      error: 'Erro ao ativar modo de visualização'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Validar CSRF
    if (!await validateCSRF(request)) {
      logger.warn('CSRF validation failed', undefined, { context: 'VIEW_AS_STUDENT_DELETE' })
      return createCSRFError()
    }

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
      })
    })

    logger.info('View-as-student mode deactivated', undefined, { context: 'VIEW_AS_STUDENT_DELETE' })

    // Return success with delay
    return NextResponse.json({
      success: true,
      redirect: '/dashboard',
      delay: 100,
      cookiesCleared: cookiesToClear
    })

  } catch (error) {
    logger.error('Error clearing view mode', error, { context: 'VIEW_AS_STUDENT_DELETE' })
    return NextResponse.json({
      error: 'Erro ao desativar modo de visualização'
    }, { status: 500 })
  }
}
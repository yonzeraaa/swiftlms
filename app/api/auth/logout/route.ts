import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { logger } from '@/lib/utils/logger'
import { validateCSRF, createCSRFError } from '@/lib/security/csrf'

export async function POST(request: NextRequest) {
  try {
    // Validar CSRF
    if (!await validateCSRF(request)) {
      logger.warn('CSRF validation failed', undefined, { context: 'AUTH_LOGOUT' })
      return createCSRFError()
    }

    const supabase = await createClient()

    // Get session before logout for logging
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id

    // Sign out from Supabase (revokes tokens on server)
    const { error } = await supabase.auth.signOut()

    if (error) {
      logger.error('Supabase signOut failed', { error, userId }, { context: 'AUTH_LOGOUT' })
      // Continue with cleanup even if signOut fails
    } else {
      logger.info('User logged out successfully', { userId }, { context: 'AUTH_LOGOUT' })
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
          sameSite: 'lax',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production'
        })
      })
    })

    return response
  } catch (error) {
    logger.error('Logout error', error, { context: 'AUTH_LOGOUT' })
    return NextResponse.json({
      error: 'Erro ao processar logout'
    }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { logger } from '@/lib/utils/logger'

// Endpoint de emergência para limpar TODOS os cookies e resetar autenticação
export async function GET(request: NextRequest) {
  try {
    logger.warn('Emergency reset endpoint called', undefined, { context: 'AUTH_RESET' })

    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()

    // Create response
    const response = NextResponse.redirect(new URL('/', request.url), {
      status: 302
    })

    // Clear ALL cookies with multiple domain variations
    const domains = [
      undefined, // Let browser handle domain
      'swiftedu.com.br',
      '.swiftedu.com.br',
      'www.swiftedu.com.br',
      '.www.swiftedu.com.br'
    ]

    allCookies.forEach(cookie => {
      domains.forEach(domain => {
        // Try to clear with each domain configuration
        response.cookies.set({
          name: cookie.name,
          value: '',
          expires: new Date(0),
          maxAge: 0,
          path: '/',
          domain,
          sameSite: 'lax',
          httpOnly: false, // Allow clearing of all types
          secure: false // Allow clearing in all contexts
        })

        // Also try with httpOnly true for auth cookies
        if (cookie.name.startsWith('sb-') || cookie.name.includes('auth')) {
          response.cookies.set({
            name: cookie.name,
            value: '',
            expires: new Date(0),
            maxAge: 0,
            path: '/',
            domain,
            sameSite: 'lax',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production'
          })
        }
      })
    })

    // Specifically target known problematic cookies
    const problematicCookies = [
      'viewAsStudent',
      'isAdminViewMode',
      'sb-mdzgnktlsmkjecdbermo-auth-token',
      'sb-mdzgnktlsmkjecdbermo-auth-token.0',
      'sb-mdzgnktlsmkjecdbermo-auth-token.1',
      'sb-access-token',
      'sb-refresh-token'
    ]

    problematicCookies.forEach(cookieName => {
      domains.forEach(domain => {
        response.cookies.set({
          name: cookieName,
          value: '',
          expires: new Date(0),
          maxAge: 0,
          path: '/',
          domain,
          sameSite: 'lax',
          httpOnly: false,
          secure: false
        })
      })
    })

    // Add header to instruct client to clear storage
    response.headers.set('X-Clear-Storage', 'true')

    logger.info('Emergency reset completed successfully', undefined, { context: 'AUTH_RESET' })
    return response

  } catch (error) {
    logger.error('Reset error', error, { context: 'AUTH_RESET' })
    return NextResponse.redirect(new URL('/', request.url))
  }
}
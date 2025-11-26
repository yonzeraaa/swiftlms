import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { logger } from '@/lib/utils/logger'
import { validateCSRF, createCSRFError } from '@/lib/security/csrf'
import { loginSchema } from '@/lib/validation/auth'
import { authRateLimiter, getClientIdentifier } from '@/app/lib/rate-limiter'

export async function POST(request: Request) {
  try {
    // Validar CSRF
    if (!await validateCSRF(request)) {
      logger.warn('CSRF validation failed', undefined, { context: 'AUTH_LOGIN' })
      return createCSRFError()
    }

    // Rate limiting
    const clientId = getClientIdentifier(request)
    if (!authRateLimiter.isAllowed(clientId)) {
      logger.warn('Rate limit exceeded for login', { clientId }, { context: 'AUTH_LOGIN' })
      return NextResponse.json(
        { error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((authRateLimiter.getResetTime(clientId) - Date.now()) / 1000))
          }
        }
      )
    }

    // Validar entrada
    const body = await request.json()
    const validation = loginSchema.safeParse(body)

    if (!validation.success) {
      logger.warn('Invalid login input', { errors: validation.error.issues }, { context: 'AUTH_LOGIN' })
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    const { email, password } = validation.data
    const supabase = await createClient()

    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      logger.error('Login failed', { message: error.message, status: error.status }, { context: 'AUTH_LOGIN' })
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    if (!data.user) {
      logger.error('Login failed - no user data', undefined, { context: 'AUTH_LOGIN' })
      return NextResponse.json(
        { error: 'Falha ao processar login' },
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
      logger.error('Failed to fetch user profile', { error: profileError, userId: data.user.id }, { context: 'AUTH_LOGIN' })
    }

    // Verify session was created
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      logger.error('Session verification failed', sessionError, { context: 'AUTH_LOGIN' })
      return NextResponse.json(
        { error: 'Falha ao estabelecer sessão' },
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
          maxAge: 60 * 60 * 3 // 3 horas
        })
      }
    })

    logger.info('Login successful', { userId: data.user.id, userRole: profile?.role }, { context: 'AUTH_LOGIN' })
    return response
  } catch (error) {
    logger.error('Unexpected login error', error, { context: 'AUTH_LOGIN' })
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}
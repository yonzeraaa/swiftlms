import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { productionCSP, developmentCSP, apiCSP, formatCSP } from './app/lib/csp-config'
import type { Database } from './lib/database.types'
import { logger } from './lib/utils/logger'

export async function ensureUserEnrollmentForPreview(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  try {
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id')

    if (coursesError) {
      logger.error('Failed to load courses for preview enrollment', coursesError, { context: 'MIDDLEWARE' })
      return
    }

    if (!courses || courses.length === 0) {
      return
    }

    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('user_id', userId)

    if (enrollmentsError) {
      logger.error('Failed to load admin enrollments', enrollmentsError, { context: 'MIDDLEWARE' })
      return
    }

    const enrolledCourseIds = new Set((enrollments || []).map(({ course_id }) => course_id))

    const coursesToEnroll = courses.filter(
      (course): course is { id: string } => !!course.id && !enrolledCourseIds.has(course.id)
    )

    if (coursesToEnroll.length === 0) {
      return
    }

    const now = new Date().toISOString()
    const newEnrollments = coursesToEnroll.map(course => ({
      user_id: userId,
      course_id: course.id,
      status: 'active',
      progress_percentage: 0,
      enrolled_at: now,
    }))

    const { error: insertError } = await supabase
      .from('enrollments')
      .insert(newEnrollments)

    if (insertError) {
      logger.error('Failed to auto-enroll admin for preview', insertError, { context: 'MIDDLEWARE' })
    }
  } catch (error) {
    logger.error('Unexpected error ensuring preview enrollment', error, { context: 'MIDDLEWARE' })
  }
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Determine environment and route type
  const isAPI = request.nextUrl.pathname.startsWith('/api/')
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Add security headers to all responses
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-Download-Options', 'noopen')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  
  // Set appropriate CSP based on route and environment
  let csp: string
  if (isAPI) {
    csp = formatCSP(apiCSP)
  } else if (isDevelopment) {
    csp = formatCSP(developmentCSP)
  } else {
    csp = formatCSP(productionCSP)
  }
  
  response.headers.set('Content-Security-Policy', csp)
  
  // Add HSTS header
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  )
  
  // CORS configuration for API routes
  if (isAPI) {
    const origin = request.headers.get('origin')
    const allowedOrigins = isDevelopment
      ? ['http://localhost:3000']
      : process.env.NEXT_PUBLIC_APP_URL 
        ? [process.env.NEXT_PUBLIC_APP_URL]
        : []
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      response.headers.set('Access-Control-Max-Age', '3600')
    }
  }
  
  // Remove timestamp headers
  response.headers.delete('X-Powered-By')
  response.headers.delete('Server')
  response.headers.delete('Date')

  // SECURITY FIX: Helper to reapply security headers after cookie operations
  const reapplySecurityHeaders = (res: NextResponse) => {
    // Security headers
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('X-Frame-Options', 'DENY')
    res.headers.set('X-XSS-Protection', '1; mode=block')
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
    res.headers.set('X-DNS-Prefetch-Control', 'off')
    res.headers.set('X-Download-Options', 'noopen')
    res.headers.set('X-Permitted-Cross-Domain-Policies', 'none')

    // CSP
    let cspToApply: string
    if (isAPI) {
      cspToApply = formatCSP(apiCSP)
    } else if (isDevelopment) {
      cspToApply = formatCSP(developmentCSP)
    } else {
      cspToApply = formatCSP(productionCSP)
    }
    res.headers.set('Content-Security-Policy', cspToApply)

    // HSTS
    res.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    )

    // CORS for API routes
    if (isAPI) {
      const origin = request.headers.get('origin')
      const allowedOrigins = isDevelopment
        ? ['http://localhost:3000']
        : process.env.NEXT_PUBLIC_APP_URL
          ? [process.env.NEXT_PUBLIC_APP_URL]
          : []

      if (origin && allowedOrigins.includes(origin)) {
        res.headers.set('Access-Control-Allow-Origin', origin)
        res.headers.set('Access-Control-Allow-Credentials', 'true')
        res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
        res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        res.headers.set('Access-Control-Max-Age', '3600')
      }
    }

    // Remove fingerprinting headers
    res.headers.delete('X-Powered-By')
    res.headers.delete('Server')
    res.headers.delete('Date')
  }

  // Create Supabase server client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Security settings for cookies with custom domain support
          const secureOptions = {
            ...options,
            sameSite: 'lax' as const,
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            path: '/',
            // Usar domínio customizado apenas para cookies do Supabase
            ...(process.env.NEXT_PUBLIC_COOKIE_DOMAIN && name.includes('sb-')
              ? { domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN }
              : {})
          }

          request.cookies.set({
            name,
            value,
            ...secureOptions,
          })

          // SECURITY FIX: Reuse response object instead of creating new one
          // This preserves security headers set earlier
          response.cookies.set({
            name,
            value,
            ...secureOptions,
          })
        },
        remove(name: string, options: CookieOptions) {
          const removeOptions = {
            ...options,
            path: '/',
            // Usar domínio customizado apenas para cookies do Supabase
            ...(process.env.NEXT_PUBLIC_COOKIE_DOMAIN && name.includes('sb-')
              ? { domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN }
              : {})
          }

          request.cookies.set({
            name,
            value: '',
            ...removeOptions,
          })

          // SECURITY FIX: Reuse response object instead of creating new one
          // This preserves security headers set earlier
          response.cookies.set({
            name,
            value: '',
            ...removeOptions,
          })
        },
      },
    }
  )

  // Tentar obter sessão e fazer refresh se necessário
  let { data: { session } } = await supabase.auth.getSession()
  
  // SECURITY FIX: Use secure logger without exposing cookie names or tokens
  const path = request.nextUrl.pathname
  logger.debug('Processing request', {
    path,
    hasSession: !!session,
  }, { context: 'MIDDLEWARE' })

  // Se não há sessão mas há refresh token, tentar refresh
  if (!session) {
    const refreshToken = request.cookies.get('sb-refresh-token')?.value
    const authToken = request.cookies.get('sb-mdzgnktlsmkjecdbermo-auth-token')?.value

    if (refreshToken || authToken) {
      logger.debug('No session but tokens present, attempting refresh', undefined, { context: 'MIDDLEWARE' })
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError) {
        logger.warn('Session refresh failed', { message: refreshError.message }, { context: 'MIDDLEWARE' })
      }

      if (refreshData?.session) {
        session = refreshData.session
        logger.debug('Session recovered via refresh', undefined, { context: 'MIDDLEWARE' })
      }
    }
  }
  
  // Se a sessão existe, verificar se está próxima de expirar
  if (session?.expires_at) {
    const expiresAt = new Date(session.expires_at * 1000).getTime()
    const now = Date.now()
    const timeUntilExpiry = expiresAt - now
    const noMargin = 0
    
    // Se a sessão expirou, fazer refresh
    if (timeUntilExpiry < noMargin) {
      logger.debug('Session expiring soon, refreshing', undefined, { context: 'MIDDLEWARE' })
      const { data: refreshData } = await supabase.auth.refreshSession()
      if (refreshData.session) {
        session = refreshData.session
        // Salvar refresh token em cookie separado para recuperação futura
        response.cookies.set({
          name: 'sb-refresh-token',
          value: refreshData.session.refresh_token,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 3, // 3 horas
          ...(process.env.NEXT_PUBLIC_COOKIE_DOMAIN 
            ? { domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN }
            : {})
        })
      }
    }
  }

  // Authentication check for API routes
  // Exceções: /api/auth/* e /api/debug-env (debug)
  if (isAPI && !session &&
      !request.nextUrl.pathname.startsWith('/api/auth/') &&
      !request.nextUrl.pathname.startsWith('/api/debug-env') &&
      !request.nextUrl.pathname.startsWith('/api/import-from-drive-runner')) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    )
  }

  // Redirect unauthenticated users from protected routes
  if (!session) {
    if (request.nextUrl.pathname.startsWith('/dashboard') || 
        request.nextUrl.pathname.startsWith('/student-dashboard')) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/'
      redirectUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Redirect authenticated users from login page to appropriate dashboard
  if (session && request.nextUrl.pathname === '/') {
    const redirectUrl = request.nextUrl.clone()
    
    // Get user role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    
    redirectUrl.pathname = profile?.role === 'student' ? '/student-dashboard' : '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // Handle student dashboard access for different roles
  if (session && request.nextUrl.pathname.startsWith('/student-dashboard')) {
    // Get user role first
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    
    // Students can access freely
    if (profile?.role === 'student') {
      return response
    }

    if (profile?.role === 'admin') {
      // SECURITY FIX: Removed DB operations from middleware (Edge runtime)
      // TODO: Move enrollment sync to dedicated endpoint /api/preview/ensure-enrollment
      // Call it explicitly when admin enables "view mode" instead of on every navigation
      // await ensureUserEnrollmentForPreview(supabase, session.user.id)
      return response
    }
    
    // For instructors only, check view mode
    if (profile?.role === 'instructor') {
      // Check query parameters as primary method
      const hasViewModeQuery = request.nextUrl.searchParams.has('viewMode') || 
                               request.nextUrl.searchParams.has('force')
      
      // Check for view mode cookies
      const viewAsStudent = request.cookies.get('viewAsStudent')?.value === 'true'
      const isAdminViewMode = request.cookies.get('isAdminViewMode')?.value === 'true'
      const adminViewId = request.cookies.get('adminViewId')?.value
      
      // SECURITY FIX: Log without exposing sensitive cookie values
      logger.debug('Instructor accessing student dashboard', {
        role: profile.role,
        hasQueryParam: hasViewModeQuery,
        hasViewPermission: hasViewModeQuery || viewAsStudent || isAdminViewMode,
        path: request.nextUrl.pathname,
      }, { context: 'MIDDLEWARE' })
      
      // Allow access if ANY of these conditions are met
      const hasViewPermission = hasViewModeQuery || viewAsStudent || isAdminViewMode || adminViewId === session.user.id
      
      if (hasViewPermission) {
        logger.debug('Instructor allowed - view mode active', undefined, { context: 'MIDDLEWARE' })
        // SECURITY FIX: Removed DB operations from middleware (Edge runtime)
        // TODO: Move enrollment sync to dedicated endpoint /api/preview/ensure-enrollment
        // await ensureUserEnrollmentForPreview(supabase, session.user.id)

        // If access is granted via query param, set cookies for future requests
        // SECURITY: httpOnly: true prevents client-side JavaScript from forging these cookies
        if (hasViewModeQuery && (!viewAsStudent || !isAdminViewMode)) {
          response.cookies.set({
            name: 'viewAsStudent',
            value: 'true',
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 3600,
            secure: process.env.NODE_ENV === 'production'
          })
          response.cookies.set({
            name: 'isAdminViewMode',
            value: 'true',
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 3600,
            secure: process.env.NODE_ENV === 'production'
          })
          // Also set adminViewId for verification
          response.cookies.set({
            name: 'adminViewId',
            value: session.user.id,
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 3600,
            secure: process.env.NODE_ENV === 'production'
          })
          logger.debug('Setting view mode cookies for instructor', undefined, { context: 'MIDDLEWARE' })
        }

        return response
      } else {
        // Instructor without view mode - redirect to dashboard
        logger.debug('Instructor redirected - no view mode', undefined, { context: 'MIDDLEWARE' })
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        return NextResponse.redirect(redirectUrl)
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

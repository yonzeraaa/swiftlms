import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { productionCSP, developmentCSP, apiCSP, formatCSP } from './app/lib/csp-config'

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
          // Security settings for cookies - let browser handle domain
          const secureOptions = {
            ...options,
            sameSite: 'lax' as const,
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            path: '/'
            // Remove domain for Supabase cookies - let Supabase handle its own cookies
          }
          
          request.cookies.set({
            name,
            value,
            ...secureOptions,
          })
          
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          
          response.cookies.set({
            name,
            value,
            ...secureOptions,
          })
        },
        remove(name: string, options: CookieOptions) {
          const removeOptions = {
            ...options,
            path: '/'
            // NO domain set - let browser handle it
          }
          
          request.cookies.set({
            name,
            value: '',
            ...removeOptions,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
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
  
  // Se não há sessão mas há refresh token, tentar refresh
  if (!session) {
    const refreshToken = request.cookies.get('sb-refresh-token')?.value
    if (refreshToken) {
      console.log('[MIDDLEWARE] Tentando refresh com token dos cookies')
      const { data: refreshData } = await supabase.auth.refreshSession({ refresh_token: refreshToken })
      if (refreshData.session) {
        session = refreshData.session
        console.log('[MIDDLEWARE] Sessão recuperada via refresh')
      }
    }
  }
  
  // Se a sessão existe, verificar se está próxima de expirar
  if (session?.expires_at) {
    const expiresAt = new Date(session.expires_at * 1000).getTime()
    const now = Date.now()
    const timeUntilExpiry = expiresAt - now
    const fiveMinutes = 5 * 60 * 1000
    
    // Se falta menos de 5 minutos para expirar, fazer refresh
    if (timeUntilExpiry < fiveMinutes) {
      console.log('[MIDDLEWARE] Sessão próxima de expirar, fazendo refresh')
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
          maxAge: 60 * 60 * 24 * 30 // 30 dias
          // Remove domain - let browser handle it
        })
      }
    }
  }

  // Authentication check for API routes
  if (isAPI && !session && !request.nextUrl.pathname.startsWith('/api/auth/')) {
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
    
    // Students and Admins can access freely
    if (profile?.role === 'student' || profile?.role === 'admin') {
      // Allow access without restrictions
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
      
      // Log for debugging
      console.log('[MIDDLEWARE] Instructor accessing student dashboard:', {
        role: profile.role,
        userId: session.user.id,
        hasQueryParam: hasViewModeQuery,
        cookies: {
          viewAsStudent,
          isAdminViewMode,
          adminViewId
        },
        path: request.nextUrl.pathname,
        timestamp: new Date().toISOString()
      })
      
      // Allow access if ANY of these conditions are met
      const hasViewPermission = hasViewModeQuery || viewAsStudent || isAdminViewMode || adminViewId === session.user.id
      
      if (hasViewPermission) {
        console.log('[MIDDLEWARE] Instructor allowed - view mode active')
        
        // If access is granted via query param, set cookies for future requests
        if (hasViewModeQuery && (!viewAsStudent || !isAdminViewMode)) {
          response.cookies.set({
            name: 'viewAsStudent',
            value: 'true',
            httpOnly: false,
            sameSite: 'lax',
            path: '/',
            maxAge: 3600,
            secure: process.env.NODE_ENV === 'production'
          })
          response.cookies.set({
            name: 'isAdminViewMode',
            value: 'true',
            httpOnly: false,
            sameSite: 'lax',
            path: '/',
            maxAge: 3600,
            secure: process.env.NODE_ENV === 'production'
          })
          console.log('[MIDDLEWARE] Setting cookies from query parameter for instructor')
        }
        
        return response
      } else {
        // Instructor without view mode - redirect to dashboard
        console.log('[MIDDLEWARE] Instructor redirected - no view mode')
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
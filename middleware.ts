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
          // Security settings for cookies - don't set domain to avoid conflicts
          const secureOptions = {
            ...options,
            sameSite: 'lax' as const,
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            path: '/'
            // Domain not set - let browser handle it
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
            // Domain not set - let browser handle it
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

  const { data: { session } } = await supabase.auth.getSession()

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

  // Handle "view as student" mode for admins
  if (session && request.nextUrl.pathname.startsWith('/student-dashboard')) {
    const viewAsStudent = request.cookies.get('viewAsStudent')?.value === 'true'
    
    if (viewAsStudent) {
      // Admin in view mode - allow access and set indicator cookie
      response.cookies.set({
        name: 'isAdminViewMode',
        value: 'true',
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
        // Domain not set - let browser handle it
      })
    } else {
      // Check if admin without view mode should be redirected
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      
      if (profile?.role === 'admin' || profile?.role === 'instructor') {
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
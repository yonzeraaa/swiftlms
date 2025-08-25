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
  
  // Add HSTS header - always include it
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  )
  
  // Strict CORS configuration for API routes
  if (isAPI) {
    const origin = request.headers.get('origin')
    
    // Only allow CORS for specific production domain
    // Remove localhost in production for maximum security
    const allowedOrigins = isDevelopment
      ? ['http://localhost:3000'] // Only localhost in development
      : process.env.NEXT_PUBLIC_APP_URL 
        ? [process.env.NEXT_PUBLIC_APP_URL] // Only configured production URL
        : [] // No CORS if not configured
    
    // Only set CORS headers if origin is explicitly allowed
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      response.headers.set('Access-Control-Max-Age', '3600') // Reduced from 86400 to 1 hour
    }
    // If origin is not allowed, no CORS headers are set (browser will block the request)
  }
  
  // Remove timestamp headers to prevent information disclosure
  response.headers.delete('X-Powered-By')
  response.headers.delete('Server')
  response.headers.delete('Date')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Only apply security settings to our own cookies, not third-party ones
          const isSupabaseCookie = name.startsWith('sb-')
          const secureOptions = isSupabaseCookie ? {
            ...options,
            sameSite: (options.sameSite || 'lax') as 'lax' | 'strict' | 'none',
            secure: options.secure !== undefined ? options.secure : process.env.NODE_ENV === 'production',
            httpOnly: options.httpOnly !== undefined ? options.httpOnly : true
          } : options
          
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
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Authentication check for API routes - must be authenticated
  if (isAPI && !session) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    )
  }

  // Se não há sessão e a rota é protegida, redireciona para login
  if (!session) {
    if (request.nextUrl.pathname.startsWith('/dashboard') || 
        request.nextUrl.pathname.startsWith('/student-dashboard')) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/'
      redirectUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Se há sessão e está na página de login, redireciona para dashboard
  if (session && request.nextUrl.pathname === '/') {
    const redirectUrl = request.nextUrl.clone()
    
    // Verificar o role do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    
    redirectUrl.pathname = profile?.role === 'student' ? '/student-dashboard' : '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
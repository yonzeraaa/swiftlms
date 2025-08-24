import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { generateCSPNonce, generateCSPHeader } from './app/lib/csp-nonce'

export async function middleware(request: NextRequest) {
  // Generate nonce for this request
  const nonce = generateCSPNonce()
  
  // Clone headers and add nonce
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-csp-nonce', nonce)
  
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Determine if this is an API route
  const isAPI = request.nextUrl.pathname.startsWith('/api/')
  
  // Add security headers to all responses
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-Download-Options', 'noopen')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  
  // Add CSP with nonce
  response.headers.set('Content-Security-Policy', generateCSPHeader(nonce, isAPI))
  
  // Add HSTS header - always include it
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  )
  
  // Add CORS headers for API routes
  if (isAPI) {
    const origin = request.headers.get('origin') || ''
    const allowedOrigins = [
      'https://swiftedu.vercel.app',
      'http://localhost:3000',
      process.env.NEXT_PUBLIC_APP_URL
    ].filter(Boolean)
    
    if (allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Max-Age', '86400')
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
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
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
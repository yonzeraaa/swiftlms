/**
 * Content Security Policy Configuration
 * Balances security with Next.js requirements
 */

// Development CSP - more permissive for HMR and development tools
export const developmentCSP = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Next.js
    "'unsafe-eval'", // Required for HMR in development
    'https://cdn.jsdelivr.net'
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for styled components and CSS-in-JS
    'https://fonts.googleapis.com'
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https:' // Allow all HTTPS images
  ],
  'font-src': [
    "'self'",
    'data:',
    'https://cdn.jsdelivr.net',
    'https://fonts.gstatic.com'
  ],
  'connect-src': [
    "'self'",
    'https://mdzgnktlsmkjecdbermo.supabase.co',
    'wss://mdzgnktlsmkjecdbermo.supabase.co',
    'wss://mdzgnktlsmkjecdbermo.supabase.co/realtime/v1/websocket',
    'https://docs.google.com',
    'ws://localhost:*', // HMR websocket
    'http://localhost:*'
  ],
  'frame-src': [
    "'self'",
    'https://docs.google.com',
    'https://drive.google.com'
  ],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"]
}

// Production CSP - stricter but still functional
export const productionCSP = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Unfortunately required for Next.js runtime
    'https://cdn.jsdelivr.net',
    'https://*.googleapis.com',
    'https://apis.google.com'
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for CSS-in-JS
    'https://fonts.googleapis.com'
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://mdzgnktlsmkjecdbermo.supabase.co',
    'https://*.googleusercontent.com',
    'https://*.googleapis.com',
    'https://*.gstatic.com'
  ],
  'font-src': [
    "'self'",
    'data:',
    'https://cdn.jsdelivr.net',
    'https://fonts.gstatic.com'
  ],
  'connect-src': [
    "'self'",
    'https://mdzgnktlsmkjecdbermo.supabase.co',
    'wss://mdzgnktlsmkjecdbermo.supabase.co',
    'wss://mdzgnktlsmkjecdbermo.supabase.co/realtime/v1/websocket',
    'https://docs.google.com',
    'https://play.google.com',
    'https://*.googleapis.com',
    'https://*.gstatic.com',
    'https://vercel.live',
    'https://vercel.com'
  ],
  'frame-src': [
    "'self'",
    'https://docs.google.com',
    'https://drive.google.com',
    'https://accounts.google.com'
  ],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': []
}

// API Routes CSP - very strict
export const apiCSP = {
  'default-src': ["'none'"],
  'script-src': ["'none'"],
  'style-src': ["'none'"],
  'img-src': ["'none'"],
  'font-src': ["'none'"],
  'connect-src': ["'self'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'none'"],
  'form-action': ["'none'"]
}

export function formatCSP(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) return key
      return `${key} ${values.join(' ')}`
    })
    .join('; ')
}
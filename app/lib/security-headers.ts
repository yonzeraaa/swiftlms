/**
 * Security Headers Configuration
 * These headers protect against common web vulnerabilities
 */

export const securityHeaders = {
  // Prevents MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevents clickjacking attacks
  'X-Frame-Options': 'DENY',
  
  // Enables XSS filter in older browsers
  'X-XSS-Protection': '1; mode=block',
  
  // Controls referrer information sent with requests
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Restricts browser features and APIs
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  
  // Prevents DNS prefetching
  'X-DNS-Prefetch-Control': 'off',
  
  // Disables client-side caching for sensitive data
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  
  // Prevents IE from executing downloads in site context
  'X-Download-Options': 'noopen',
  
  // Disables Flash and other plugins
  'X-Permitted-Cross-Domain-Policies': 'none',
}

export const productionHeaders = {
  ...securityHeaders,
  // Forces HTTPS for 1 year including subdomains
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
}

// Content Security Policy configurations
export const cspDirectives = {
  development: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:', 'blob:'],
    'font-src': ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
    'connect-src': ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co', 'https://docs.google.com'],
    'frame-src': ["'self'", 'https://docs.google.com'],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': [],
  },
  production: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:', 'blob:'],
    'font-src': ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
    'connect-src': ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co', 'https://docs.google.com'],
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': [],
    'block-all-mixed-content': [],
  },
}

export function generateCSP(env: 'development' | 'production' = 'production'): string {
  const directives = cspDirectives[env]
  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) return key
      return `${key} ${values.join(' ')}`
    })
    .join('; ')
}

// Nonce generation for inline scripts (if needed)
export function generateNonce(): string {
  const array = new Uint8Array(16)
  if (typeof crypto !== 'undefined') {
    crypto.getRandomValues(array)
  }
  return Buffer.from(array).toString('base64')
}
// Generate a nonce for Content Security Policy
export function generateCSPNonce(): string {
  // Use Web Crypto API for Edge Runtime compatibility
  const array = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  
  // Convert to base64
  let binary = ''
  array.forEach(byte => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

// Store nonce in a way that can be accessed by components
let currentNonce: string | null = null

export function setCSPNonce(nonce: string) {
  currentNonce = nonce
}

export function getCSPNonce(): string | null {
  return currentNonce
}

// Generate CSP header with nonce
export function generateCSPHeader(nonce: string, isAPI = false): string {
  if (isAPI) {
    // Strict CSP for API routes - no inline scripts allowed
    return [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self' https://bxzsdvgxawvlqsuodaqy.supabase.co wss://bxzsdvgxawvlqsuodaqy.supabase.co https://docs.google.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join('; ')
  }

  // CSP for app routes with nonce for required inline scripts
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://cdn.jsdelivr.net`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: https://bxzsdvgxawvlqsuodaqy.supabase.co blob:",
    "font-src 'self' data: https://cdn.jsdelivr.net",
    "connect-src 'self' https://bxzsdvgxawvlqsuodaqy.supabase.co wss://bxzsdvgxawvlqsuodaqy.supabase.co https://docs.google.com",
    "frame-src 'self' https://docs.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ')
}
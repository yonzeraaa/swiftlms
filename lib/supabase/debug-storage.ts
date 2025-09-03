export function debugStorage() {
  if (typeof window === 'undefined') {
    console.log('[DEBUG] Running on server, no storage available')
    return
  }

  console.log('[DEBUG] ===== STORAGE DEBUG =====')
  
  // Check localStorage
  console.log('[DEBUG] localStorage keys:')
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.includes('sb-') || key?.includes('supabase') || key?.includes('auth')) {
      console.log(`[DEBUG] - ${key}: ${localStorage.getItem(key)?.substring(0, 100)}...`)
    }
  }

  // Check cookies
  console.log('[DEBUG] Cookies:')
  const cookies = document.cookie.split(';')
  let cookieValue: string | null = null
  
  cookies.forEach(cookie => {
    const [name, value] = cookie.trim().split('=')
    if (name?.includes('sb-') || name?.includes('supabase') || name?.includes('auth')) {
      console.log(`[DEBUG] - ${name}: ${value?.substring(0, 100)}...`)
      
      // Try to decode if it's a base64 cookie
      if (value?.startsWith('base64-')) {
        try {
          const decoded = atob(value.substring(7))
          console.log(`[DEBUG] - ${name} (decoded): ${decoded.substring(0, 100)}...`)
          if (name === 'sb-mdzgnktlsmkjecdbermo-auth-token') {
            cookieValue = decoded
          }
        } catch (e) {
          console.log(`[DEBUG] - ${name}: Failed to decode base64`)
        }
      } else if (name === 'sb-mdzgnktlsmkjecdbermo-auth-token') {
        cookieValue = decodeURIComponent(value || '')
      }
    }
  })

  // Check specific Supabase key
  const specificKey = 'sb-mdzgnktlsmkjecdbermo-auth-token'
  const localValue = localStorage.getItem(specificKey)
  console.log(`[DEBUG] Specific key ${specificKey} in localStorage:`, localValue ? 'EXISTS' : 'NULL')
  console.log(`[DEBUG] Specific key ${specificKey} in cookies:`, cookieValue ? 'EXISTS' : 'NULL')
  
  // Try to parse session from localStorage first, then cookies
  const sessionData = localValue || cookieValue
  if (sessionData) {
    try {
      const parsed = JSON.parse(sessionData)
      console.log('[DEBUG] Parsed session:', {
        hasSession: !!parsed.currentSession,
        expiresAt: parsed.currentSession?.expires_at,
        accessToken: parsed.currentSession?.access_token ? 'EXISTS' : 'NULL',
        refreshToken: parsed.currentSession?.refresh_token ? 'EXISTS' : 'NULL',
        source: localValue ? 'localStorage' : 'cookies'
      })
    } catch (e) {
      console.log('[DEBUG] Failed to parse session:', e)
    }
  } else {
    console.log('[DEBUG] No session data found in localStorage or cookies')
  }
  
  console.log('[DEBUG] =====================')
}
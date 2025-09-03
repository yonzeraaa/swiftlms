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
  cookies.forEach(cookie => {
    const [name, value] = cookie.trim().split('=')
    if (name?.includes('sb-') || name?.includes('supabase') || name?.includes('auth')) {
      console.log(`[DEBUG] - ${name}: ${value?.substring(0, 100)}...`)
    }
  })

  // Check specific Supabase key
  const specificKey = 'sb-mdzgnktlsmkjecdbermo-auth-token'
  const localValue = localStorage.getItem(specificKey)
  console.log(`[DEBUG] Specific key ${specificKey}:`, localValue ? 'EXISTS' : 'NULL')
  
  if (localValue) {
    try {
      const parsed = JSON.parse(localValue)
      console.log('[DEBUG] Parsed session:', {
        hasSession: !!parsed.currentSession,
        expiresAt: parsed.currentSession?.expires_at,
        accessToken: parsed.currentSession?.access_token ? 'EXISTS' : 'NULL',
        refreshToken: parsed.currentSession?.refresh_token ? 'EXISTS' : 'NULL'
      })
    } catch (e) {
      console.log('[DEBUG] Failed to parse session:', e)
    }
  }
  
  console.log('[DEBUG] =====================')
}
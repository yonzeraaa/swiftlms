'use client'

export function syncAuthCookies() {
  if (typeof window === 'undefined') return

  const storageKey = `sb-mdzgnktlsmkjecdbermo-auth-token`
  const storedAuth = localStorage.getItem(storageKey)
  
  if (!storedAuth) {
    console.log('[CookieSync] Sem dados no localStorage')
    return
  }

  try {
    const authData = JSON.parse(storedAuth)
    
    if (!authData.access_token || !authData.refresh_token) {
      console.log('[CookieSync] Tokens inválidos no localStorage')
      return
    }

    // Verificar se os cookies existem
    const cookies = document.cookie.split(';').map(c => c.trim())
    const hasAccessToken = cookies.some(c => c.startsWith('sb-access-token='))
    const hasRefreshToken = cookies.some(c => c.startsWith('sb-refresh-token='))
    
    if (!hasAccessToken || !hasRefreshToken) {
      console.log('[CookieSync] Sincronizando cookies do localStorage')
      
      // Configurar cookies manualmente
      const isProduction = window.location.protocol === 'https:'
      const cookieOptions = isProduction 
        ? `; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`
        : `; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`
      
      // Criar cookies
      document.cookie = `sb-access-token=${authData.access_token}${cookieOptions}`
      document.cookie = `sb-refresh-token=${authData.refresh_token}${cookieOptions}`
      
      // Também criar o cookie principal
      document.cookie = `${storageKey}=${encodeURIComponent(storedAuth)}${cookieOptions}`
      
      console.log('[CookieSync] Cookies sincronizados com sucesso')
    } else {
      console.log('[CookieSync] Cookies já existem')
    }
  } catch (error) {
    console.error('[CookieSync] Erro ao sincronizar:', error)
  }
}
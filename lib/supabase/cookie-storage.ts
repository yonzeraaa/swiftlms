import { CookieOptions } from '@supabase/ssr'

export function createCookieStorage() {
  return {
    getItem: async (key: string): Promise<string | null> => {
      // Tentar obter do cookie primeiro
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';')
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=')
          if (name === key) {
            return decodeURIComponent(value)
          }
        }
      }
      
      // Fallback para localStorage
      if (typeof window !== 'undefined') {
        return localStorage.getItem(key)
      }
      
      return null
    },
    
    setItem: async (key: string, value: string): Promise<void> => {
      // Salvar em ambos: cookie e localStorage
      if (typeof document !== 'undefined') {
        const cookieOptions: CookieOptions = {
          maxAge: 60 * 60 * 3, // 3 horas
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        }
        
        // Adicionar domain apenas em produção (usando NEXT_PUBLIC_ para client-side)
        const domain = process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_COOKIE_DOMAIN 
          ? process.env.NEXT_PUBLIC_COOKIE_DOMAIN 
          : undefined
        
        // Construir string do cookie
        let cookieString = `${key}=${encodeURIComponent(value)}`
        cookieString += `; path=${cookieOptions.path}`
        cookieString += `; max-age=${cookieOptions.maxAge}`
        cookieString += `; SameSite=${cookieOptions.sameSite}`
        
        if (domain) {
          cookieString += `; Domain=${domain}`
        }
        
        if (cookieOptions.secure) {
          cookieString += '; Secure'
        }
        
        document.cookie = cookieString
      }
      
      // Também salvar no localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value)
        
        // Notificar outras abas via BroadcastChannel
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel('auth_storage_sync')
          channel.postMessage({ type: 'STORAGE_UPDATED', key, value })
          channel.close()
        }
      }
    },
    
    removeItem: async (key: string): Promise<void> => {
      // Remover de ambos
      if (typeof document !== 'undefined') {
        document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax`
      }
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key)
        
        // Notificar outras abas
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel('auth_storage_sync')
          channel.postMessage({ type: 'STORAGE_REMOVED', key })
          channel.close()
        }
      }
    }
  }
}

// Função auxiliar para sincronizar storage entre abas
export function setupStorageSync() {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    const channel = new BroadcastChannel('auth_storage_sync')
    
    channel.onmessage = (event) => {
      if (event.data.type === 'STORAGE_UPDATED') {
        const { key, value } = event.data
        
        // Atualizar localStorage local
        localStorage.setItem(key, value)
        
        // Atualizar cookie local
        const domain = process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_COOKIE_DOMAIN 
          ? `; Domain=${process.env.NEXT_PUBLIC_COOKIE_DOMAIN}` 
          : ''
        const cookieString = `${key}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 3}; SameSite=Lax${domain}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
        document.cookie = cookieString
      } else if (event.data.type === 'STORAGE_REMOVED') {
        const { key } = event.data
        
        // Remover de ambos
        localStorage.removeItem(key)
        document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax`
      }
    }
    
    return () => channel.close()
  }
  
  return () => {}
}
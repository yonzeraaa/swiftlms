import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'

// Singleton pattern - only create one instance of the client
let browserClient: any = null

export function createClient(forceNew = false): any {
  // Force new client if requested (useful for auth issues)
  if (forceNew) {
    browserClient = null
  }
  
  // Return existing client if it already exists (singleton pattern)
  if (browserClient && !forceNew) {
    return browserClient
  }

  // Determinar se estamos em produção
  const isProduction = process.env.NODE_ENV === 'production'

  // Create new client with enhanced auth configuration
  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Configuração de cookies simplificada para Vercel
      cookieOptions: {
        name: 'sb-auth-token',
        maxAge: 60 * 60 * 3, // 3 horas
        path: '/',
        sameSite: 'lax',
        secure: isProduction
      },
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        // Storage personalizado para melhor compatibilidade
        storage: typeof window !== 'undefined' ? {
          getItem: (key: string) => {
            // Primeiro tentar localStorage, depois cookies
            const localValue = localStorage.getItem(key)
            if (localValue) return localValue
            
            // Fallback para cookies se localStorage falhar
            const cookies = document.cookie.split(';')
            for (const cookie of cookies) {
              const [name, value] = cookie.trim().split('=')
              if (name === key) {
                return decodeURIComponent(value)
              }
            }
            return null
          },
          setItem: (key: string, value: string) => {
            // Salvar em localStorage
            localStorage.setItem(key, value)
            
            // Salvar em cookie
            const cookieOptions = isProduction 
              ? `; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 3}`
              : `; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 3}`
            
            document.cookie = `${key}=${encodeURIComponent(value)}${cookieOptions}`
          },
          removeItem: (key: string) => {
            localStorage.removeItem(key)
            // Remover cookie também
            const cookieOptions = isProduction 
              ? `; Secure; SameSite=Lax; Path=/; Max-Age=0`
              : `; SameSite=Lax; Path=/; Max-Age=0`
            document.cookie = `${key}=; Expires=Thu, 01 Jan 1970 00:00:00 UTC${cookieOptions}`
          }
        } : undefined
      },
      // Headers para debugging e identificação
      global: {
        headers: {
          'X-Client-Info': 'swiftedu-web',
          'X-Client-Version': '2.0'
        }
      }
    }
  )

  return browserClient
}
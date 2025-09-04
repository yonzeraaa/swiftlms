import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'

// Singleton pattern - only create one instance of the client
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient(forceNew = false) {
  // Force new client if requested (useful for auth issues)
  if (forceNew) {
    browserClient = null
  }
  
  // Return existing client if it already exists (singleton pattern)
  if (browserClient) {
    return browserClient
  }

  // Determinar se estamos em produ\u00e7\u00e3o
  const isProduction = process.env.NODE_ENV === 'production' || 
                       (typeof window !== 'undefined' && window.location.hostname.includes('swiftedu.com.br'))

  // Create new client with proper cookie configuration
  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        // Configurar cookies para produ\u00e7\u00e3o
        ...(isProduction && {
          cookieOptions: {
            domain: '.swiftedu.com.br',
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 dias
          }
        })
      },
      // Adicionar headers customizados se necess\u00e1rio
      global: {
        headers: {
          'X-Client-Info': 'swiftedu-web'
        }
      }
    }
  )

  return browserClient
}
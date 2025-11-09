import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'

// Singleton pattern - only create one instance of the client
let browserClient: any = null

/**
 * Custom storage adapter that prevents client-side token persistence
 * SECURITY: This adapter prevents XSS attacks by never storing tokens in JS-accessible storage
 */
const secureStorageAdapter = {
  getItem: async (_key: string): Promise<string | null> => {
    // Never return stored tokens on client - force server-side auth
    return null
  },
  setItem: async (_key: string, _value: string): Promise<void> => {
    // Never persist tokens on client - server manages all auth state
    return
  },
  removeItem: async (_key: string): Promise<void> => {
    // No-op since we never store anything
    return
  }
}

export function createClient(forceNew = false): any {
  // Force new client if requested (useful for auth issues)
  if (forceNew) {
    browserClient = null
  }

  // Return existing client if it already exists (singleton pattern)
  if (browserClient && !forceNew) {
    return browserClient
  }

  // Create new client with secure configuration
  // SECURITY: Custom storage adapter prevents token exposure to XSS
  // All auth state is managed server-side via httpOnly cookies
  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Session is managed server-side via httpOnly cookies
        // This prevents XSS attacks from stealing tokens
        persistSession: false, // Server-side only
        detectSessionInUrl: true,
        autoRefreshToken: false, // Server handles refresh
        storage: secureStorageAdapter, // Custom adapter that never persists tokens
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
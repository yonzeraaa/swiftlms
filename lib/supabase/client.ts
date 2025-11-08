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

  // Create new client with secure configuration
  // SECURITY: Removed custom storage that exposed tokens to XSS
  // Now using @supabase/ssr default storage which uses httpOnly cookies only
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
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'

// Singleton pattern - only create one instance of the client
let browserClient: any = null

/**
 * Creates a Supabase browser client with default @supabase/ssr storage
 *
 * SECURITY NOTE: @supabase/ssr stores tokens in cookies that are readable by JavaScript.
 * This means any XSS vulnerability can potentially steal authentication tokens.
 *
 * MITIGATION STRATEGIES IN PLACE:
 * - Content Security Policy (CSP) headers in middleware restrict script sources
 * - SameSite=Lax on all cookies prevents CSRF
 * - Secure flag in production ensures HTTPS-only transmission
 * - Input validation with Zod prevents injection attacks
 * - Regular security audits and dependency updates
 *
 * RECOMMENDED FUTURE IMPROVEMENTS:
 * 1. Migrate to server-side data fetching (Server Components, Server Actions)
 * 2. Use tRPC or similar for type-safe server-only API calls
 * 3. Implement a custom auth proxy that adds tokens server-side
 * 4. Consider NextAuth.js with secure session management
 */
export function createClient(forceNew = false): any {
  // Force new client if requested (useful for auth issues)
  if (forceNew) {
    browserClient = null
  }

  // Return existing client if it already exists (singleton pattern)
  if (browserClient && !forceNew) {
    return browserClient
  }

  // Create new client with @supabase/ssr default configuration
  // Tokens will be stored in JS-readable cookies for client-side RLS queries
  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
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
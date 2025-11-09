import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'

// Singleton pattern - only create one instance of the client
let browserClient: any = null

/**
 * Creates a Supabase browser client WITHOUT storing tokens in JS-accessible cookies
 *
 * SECURITY IMPROVEMENT:
 * - persistSession: false - Client does NOT store tokens in cookies
 * - autoRefreshToken: false - No automatic token refresh on client
 * - Authentication is managed server-side via httpOnly cookies
 * - Client is used ONLY for public operations or when auth is already verified server-side
 *
 * SERVER-SIDE AUTH FLOW:
 * 1. Login via /api/auth/login endpoint (sets httpOnly cookies)
 * 2. Server components/actions use lib/supabase/server.ts (reads httpOnly cookies)
 * 3. Client components use AuthProvider (calls server actions for session status)
 * 4. NO tokens exposed to JavaScript - eliminates XSS token theft risk
 *
 * USE CASES FOR THIS CLIENT:
 * - Public data queries (courses catalog, public info)
 * - Operations where user is already authenticated server-side
 * - NEVER for authentication or sensitive queries
 */
export function createClient(forceNew = false): any {
  // Force new client if requested (useful for testing)
  if (forceNew) {
    browserClient = null
  }

  // Return existing client if it already exists (singleton pattern)
  if (browserClient && !forceNew) {
    return browserClient
  }

  // Create client WITHOUT session persistence
  // Auth tokens are NEVER stored in JS-accessible cookies
  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        detectSessionInUrl: false, // Don't auto-detect session from URL
        persistSession: false,      // CRITICAL: Don't persist session in cookies
        autoRefreshToken: false,    // CRITICAL: Don't auto-refresh tokens
        storage: undefined,         // No storage - session only in memory (cleared on page refresh)
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
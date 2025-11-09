import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'

// Singleton pattern - only create one instance of the client
let browserClient: any = null

/**
 * ⚠️ PUBLIC-ONLY SUPABASE CLIENT - NO AUTHENTICATION ⚠️
 *
 * This browser client is configured for PUBLIC, NON-AUTHENTICATED operations ONLY.
 *
 * CONFIGURATION:
 * - persistSession: false → Does NOT store auth tokens in localStorage
 * - autoRefreshToken: false → Does NOT auto-refresh tokens
 * - detectSessionInUrl: false → Does NOT detect sessions from URL
 * - storage: undefined → No persistent storage for tokens
 *
 * ❌ DO NOT USE THIS CLIENT FOR:
 * - Authenticated queries (private tables with RLS)
 * - User-specific data
 * - Session management (login, logout, password reset)
 * - Any operation requiring authentication
 *
 * ✅ USE THIS CLIENT ONLY FOR:
 * - Public data queries (tables with public read access, no RLS)
 * - Non-sensitive UI operations
 * - Public search/filtering
 *
 * 📋 FOR AUTHENTICATED OPERATIONS, USE SERVER ACTIONS:
 *
 * Instead of:
 * ```typescript
 * const supabase = createClient()
 * const { data } = await supabase.from('users').select() // ❌ WRONG
 * ```
 *
 * Do this:
 * ```typescript
 * import { getUsers } from '@/lib/actions/users'
 * const { data } = await getUsers() // ✅ CORRECT
 * ```
 *
 * Server actions are in:
 * - lib/actions/auth.ts - Authentication (login, logout, session)
 * - lib/actions/admin-*.ts - Admin operations
 * - lib/actions/student-*.ts - Student operations
 * - lib/actions/browse-enroll.ts - Public browse + enrollment
 *
 * WHY THIS ARCHITECTURE?
 *
 * SECURITY: httpOnly Cookies
 * - Server actions use lib/supabase/server.ts
 * - Server client reads httpOnly cookies (JS cannot access)
 * - Tokens never exposed to JavaScript
 * - XSS attacks cannot steal tokens
 *
 * This public client has NO tokens, so there's nothing to steal.
 * All sensitive operations happen server-side with httpOnly cookies.
 *
 * REFERENCE:
 * - See SECURITY.md for complete architecture documentation
 * - https://supabase.com/docs/guides/auth/server-side-rendering
 */
export function createClient(forceNew = false): any {
  // Force new client if requested
  if (forceNew) {
    browserClient = null
  }

  // Return existing client if it already exists (singleton pattern)
  if (browserClient && !forceNew) {
    return browserClient
  }

  // Create PUBLIC-ONLY browser client (NO authentication)
  // This client will NOT have access to user sessions or protected data
  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,      // ✅ Do NOT store tokens in localStorage
        autoRefreshToken: false,    // ✅ Do NOT auto-refresh tokens
        detectSessionInUrl: false,  // ✅ Do NOT detect sessions from URL
        storage: undefined,         // ✅ No storage - session only in memory (cleared on page refresh)
      },
      global: {
        headers: {
          'X-Client-Info': 'swiftedu-web-public',
          'X-Client-Version': '3.0'
        }
      }
    }
  )

  return browserClient
}
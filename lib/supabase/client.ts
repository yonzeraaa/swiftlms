import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'

// Singleton pattern - only create one instance of the client
let browserClient: any = null

/**
 * Creates a Supabase browser client for PUBLIC/NON-SENSITIVE operations only
 *
 * ⚠️ SECURITY WARNING - IMPORTANT:
 *
 * The browser client (createBrowserClient) stores session tokens in localStorage,
 * which IS accessible to JavaScript. This means:
 * - Any XSS vulnerability can steal authentication tokens from localStorage
 * - Tokens are NOT stored in httpOnly cookies when using the browser SDK
 * - This client should ONLY be used for public data or non-authenticated operations
 *
 * CORRECT ARCHITECTURE FOR AUTHENTICATED DATA:
 *
 * 1. SERVER-SIDE AUTH (✅ Secure - uses httpOnly cookies):
 *    - Use lib/supabase/server.ts (createServerClient) in:
 *      * Server Components
 *      * Server Actions
 *      * API Routes
 *    - This client reads httpOnly cookies set by middleware
 *    - Tokens never exposed to JavaScript
 *
 * 2. CLIENT-SIDE (⚠️ Limited use - tokens in localStorage):
 *    - This browser client should ONLY be used for:
 *      * Public data queries (no authentication required)
 *      * UI helpers that don't touch sensitive data
 *      * File uploads via signed URLs (if using Storage)
 *    - For authenticated data, call server actions instead
 *
 * 3. AUTH STATE MANAGEMENT:
 *    - AuthProvider calls server actions (lib/actions/auth.ts)
 *    - Server actions use lib/supabase/server.ts internally
 *    - Client receives sanitized user data (no raw tokens)
 *
 * MIGRATION STATUS:
 * - 25+ pages migrated to server actions (authenticated data server-side)
 * - AuthProvider uses server actions for session management
 * - This client used minimally in codebase
 *
 * WHY NOT JUST DISABLE THIS CLIENT?
 * - Some operations (file uploads, public search) may need browser SDK
 * - Real-time features require browser client
 * - Better to have it with clear warnings than break those features
 *
 * REFERENCE:
 * https://supabase.com/docs/guides/auth/server-side/creating-a-client
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

  // Create standard browser client
  // ⚠️ This stores tokens in localStorage (NOT httpOnly cookies)
  // Only use for public/non-sensitive operations
  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
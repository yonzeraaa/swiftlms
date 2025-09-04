import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'
import { createCookieStorage } from './cookie-storage'

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

  // Create new client with improved configuration
  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        storage: createCookieStorage(),
        storageKey: `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '')}-auth-token`
      }
    }
  )

  return browserClient
}
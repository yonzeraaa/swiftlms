import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'

// Singleton pattern - only create one instance of the client
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  // Return existing client if it already exists (singleton pattern)
  if (browserClient) {
    return browserClient
  }

  // Create new client with simplified configuration
  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return browserClient
}
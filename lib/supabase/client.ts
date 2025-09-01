import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        detectSessionInUrl: true
      },
      realtime: {
        params: {
          eventsPerSecond: 2
        },
        heartbeatIntervalMs: 30000,
        timeout: 10000
      },
      global: {
        headers: {
          'X-Client-Info': 'swiftedu-app'
        }
      }
    }
  )
}
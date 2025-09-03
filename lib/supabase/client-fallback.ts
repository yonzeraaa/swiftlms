import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'

export function createClientFallback() {
  console.log('[SUPABASE FALLBACK] Creating client with default storage')
  
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Using default storage instead of custom
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        flowType: 'pkce',
        debug: true
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
          'X-Client-Info': 'swiftedu-app-fallback',
          'X-Client-Version': '1.0.0'
        }
      }
    }
  )
}
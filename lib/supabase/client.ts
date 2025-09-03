import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'
import { customStorageAdapter } from './storage'

export function createClient() {
  console.log('[SUPABASE] Creating client with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: customStorageAdapter, // Using custom storage - default storage is not persisting
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        flowType: 'pkce',
        debug: true, // Enable debug in production temporarily
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
          'X-Client-Info': 'swiftedu-app',
          'X-Client-Version': '1.0.0'
        }
      }
    }
  )
}
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'
import { customStorageAdapter } from './storage'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: customStorageAdapter,
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        flowType: 'pkce',
        debug: process.env.NODE_ENV === 'development',
        storageKey: 'sb-auth-token'
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
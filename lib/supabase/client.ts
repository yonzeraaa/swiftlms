import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '../database.types'
import { customStorageAdapter } from './storage'

export function createClient() {
  console.log('[SUPABASE] Creating client with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('[SUPABASE] Using custom storage adapter:', customStorageAdapter)
  
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: customStorageAdapter,
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        flowType: 'pkce',
        debug: true,
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
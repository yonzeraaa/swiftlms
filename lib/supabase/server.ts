import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '../database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieOptions = {
                ...options,
                sameSite: 'lax' as const,
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                path: '/'
              }
              cookieStore.set(name, value, cookieOptions)
            })
          } catch (error) {
            // Log error in development for debugging
            if (process.env.NODE_ENV === 'development') {
              console.error('Failed to set cookie:', error)
            }
            // In production, we still need to handle Server Component calls
            // but we should at least know when this happens
          }
        },
      },
    }
  )
}
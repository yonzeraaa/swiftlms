import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  
  const response = NextResponse.json({ success: true })
  
  allCookies.forEach(cookie => {
    if (cookie.name.startsWith('sb-')) {
      response.cookies.set(cookie.name, '', {
        maxAge: 0,
        path: '/',
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      })
    }
  })
  
  return response
}
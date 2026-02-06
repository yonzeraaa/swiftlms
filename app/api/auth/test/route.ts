import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // This endpoint is for local diagnostics only
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const { data: { session } } = await supabase.auth.getSession()

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      hasSession: !!session,
      expiresAt: session?.expires_at ?? null
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Unexpected error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

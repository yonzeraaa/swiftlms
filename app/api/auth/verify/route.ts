import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // This endpoint is for local diagnostics only
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { session } } = await supabase.auth.getSession()

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      hasSession: !!session,
      expiresAt: session?.expires_at ?? null,
      path: request.nextUrl.pathname
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * Get view-mode status
 * SECURITY: Reads httpOnly cookies server-side to prevent client manipulation
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient()

    // Get user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ isViewMode: false, isAdmin: false })
    }

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Check httpOnly view-mode cookies
    const viewAsStudent = cookieStore.get('viewAsStudent')
    const isAdminViewMode = cookieStore.get('isAdminViewMode')
    const adminViewId = cookieStore.get('adminViewId')

    const isViewMode = !!(
      viewAsStudent?.value === 'true' ||
      isAdminViewMode?.value === 'true' ||
      adminViewId?.value
    )

    logger.info('View mode status checked', {
      userId: user.id,
      userRole: profile?.role,
      isViewMode
    }, { context: 'VIEW_MODE_STATUS' })

    return NextResponse.json({
      isViewMode,
      isAdmin: profile?.role === 'admin' || profile?.role === 'instructor',
      userRole: profile?.role
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    })
  } catch (error) {
    logger.error('Error checking view mode status', error, { context: 'VIEW_MODE_STATUS' })
    return NextResponse.json({
      isViewMode: false,
      isAdmin: false,
      error: 'Failed to check view mode status'
    }, { status: 500 })
  }
}

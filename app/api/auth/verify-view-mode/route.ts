import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient()
    
    // Get user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ 
        canAccess: false, 
        reason: 'Not authenticated' 
      })
    }
    
    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    // Students always have access
    if (profile?.role === 'student') {
      return NextResponse.json({ 
        canAccess: true, 
        role: 'student',
        needsViewMode: false 
      })
    }
    
    // Check view mode cookies for admin/instructor
    const viewAsStudent = cookieStore.get('viewAsStudent')?.value === 'true'
    const isAdminViewMode = cookieStore.get('isAdminViewMode')?.value === 'true'
    const adminViewId = cookieStore.get('adminViewId')?.value
    
    const hasViewMode = viewAsStudent || isAdminViewMode || adminViewId === user.id
    
    return NextResponse.json({
      canAccess: hasViewMode,
      role: profile?.role,
      needsViewMode: true,
      cookies: {
        viewAsStudent,
        isAdminViewMode,
        adminViewId: !!adminViewId
      }
    })
    
  } catch (error) {
    console.error('Error verifying view mode:', error)
    return NextResponse.json({ 
      canAccess: false, 
      error: 'Failed to verify' 
    }, { status: 500 })
  }
}
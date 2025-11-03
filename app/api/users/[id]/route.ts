import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is admin
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ error: 'Failed to verify user permissions' }, { status: 500 })
    }

    if (currentUserProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only admins can delete users' }, { status: 403 })
    }

    const { id: userId } = await params
    
    // Prevent admin from deleting themselves
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    console.log('Attempting to delete user:', userId)

    // First, try to use the RPC function if it exists
    try {
      const { data, error: rpcError } = await (supabase as any)
        .rpc('delete_user_completely', { user_id_to_delete: userId })

      if (!rpcError) {
        console.log('User deleted successfully using RPC:', userId)
        return NextResponse.json({ success: true, message: 'User deleted successfully' })
      }
      
      console.log('RPC function not available or failed, falling back to manual deletion:', rpcError)
    } catch (rpcError) {
      console.log('RPC function not available, proceeding with manual deletion')
    }

    // Fallback: Manual deletion with proper order
    // 1. Delete lesson_progress
    await supabase.from('lesson_progress').delete().eq('user_id', userId)
    
    // 2. Delete test_attempts
    await supabase.from('test_attempts').delete().eq('user_id', userId)
    
    // 3. Delete test_grades
    await supabase.from('test_grades').delete().eq('user_id', userId)
    
    // 4. Delete course_reviews
    await supabase.from('course_reviews').delete().eq('user_id', userId)
    
    // 5. Delete enrollments
    await supabase.from('enrollments').delete().eq('user_id', userId)
    
    // 6. Delete certificates
    await supabase.from('certificates').delete().eq('user_id', userId)
    
    // 7. Delete certificate_requests
    await supabase.from('certificate_requests').delete().eq('user_id', userId)
    
    // 8. Update certificates where user approved
    await supabase.from('certificates').update({ approved_by: null }).eq('approved_by', userId)
    
    // 9. Update certificate_requests where user processed
    await supabase.from('certificate_requests').update({ processed_by: null }).eq('processed_by', userId)
    
    // 10. Delete activity_logs
    await supabase.from('activity_logs').delete().eq('user_id', userId)
    
    // 11. Delete import_progress
    await supabase.from('import_progress' as any).delete().eq('user_id', userId)
    
    // 12. Delete certificate_requirements
    await supabase.from('certificate_requirements').delete().eq('user_id', userId)
    
    // 13. Update courses where user is instructor
    await supabase.from('courses').update({ instructor_id: null }).eq('instructor_id', userId)
    
    // 14. Finally, delete the profile
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete user profile: ' + profileDeleteError.message },
        { status: 500 }
      )
    }

    console.log('User deleted successfully (manual):', userId)
    return NextResponse.json({ success: true, message: 'User deleted successfully' })
  } catch (error: any) {
    console.error('Unexpected error deleting user:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred while deleting the user' },
      { status: 500 }
    )
  }
}
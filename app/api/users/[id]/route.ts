import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is admin
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (currentUserProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only admins can delete users' }, { status: 403 })
    }

    const { id: userId } = await params

    // Delete related data in order to avoid foreign key constraints
    // 1. Delete activity logs
    await supabase
      .from('activity_logs')
      .delete()
      .eq('user_id', userId)

    // 2. Delete lesson progress
    await supabase
      .from('lesson_progress')
      .delete()
      .eq('user_id', userId)

    // 3. Delete course reviews
    await supabase
      .from('course_reviews')
      .delete()
      .eq('user_id', userId)

    // 4. Delete enrollments
    await supabase
      .from('enrollments')
      .delete()
      .eq('user_id', userId)

    // 5. Delete from profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      throw profileError
    }

    // Try to delete from auth.users if service role key is available
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const serviceSupabase = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )

        const { error: authDeleteError } = await serviceSupabase.auth.admin.deleteUser(userId)
        
        if (authDeleteError) {
          console.error('Error deleting auth user:', authDeleteError)
          // Continue even if auth deletion fails
        }
      } catch (error) {
        console.error('Error using service role:', error)
      }
    } else {
      console.log('Service role key not configured. Auth user will remain but cannot access the system.')
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    )
  }
}
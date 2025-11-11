import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

    // Use RPC function to delete user and all related data from database
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('delete_user_completely', { user_id_to_delete: userId })

    if (rpcError) {
      console.error('Error calling delete_user_completely RPC:', rpcError)
      return NextResponse.json(
        {
          error: 'Database deletion failed',
          details: rpcError.message
        },
        { status: 500 }
      )
    }

    // Check RPC result (cast to any to handle dynamic JSON response)
    const result = rpcResult as any
    if (!result || result.success === false) {
      console.error('RPC returned error:', result)
      return NextResponse.json(
        {
          error: result?.error || 'Failed to delete user from database',
          details: result?.detail
        },
        { status: 500 }
      )
    }

    console.log('User deleted from database successfully:', userId)

    // Delete user from Auth using admin client
    try {
      const adminClient = createAdminClient()
      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId)

      if (authDeleteError) {
        console.error('Error deleting user from Auth:', authDeleteError)
        // Don't fail the whole operation - database is already cleaned up
        // Just log and warn in response
        return NextResponse.json({
          success: true,
          warning: 'User deleted from database but failed to delete from Auth',
          authError: authDeleteError.message
        })
      }

      console.log('User deleted from Auth successfully:', userId)
    } catch (authError: any) {
      console.error('Unexpected error deleting from Auth:', authError)
      // Same as above - don't fail since DB is clean
      return NextResponse.json({
        success: true,
        warning: 'User deleted from database but Auth deletion had issues',
        authError: authError.message
      })
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted completely from database and authentication system'
    })
  } catch (error: any) {
    console.error('Unexpected error deleting user:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred while deleting the user' },
      { status: 500 }
    )
  }
}
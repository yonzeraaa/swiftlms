import { createClient } from '@/lib/supabase/server'
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

    // Use the new function to delete user completely
    const { data, error: deleteError } = await supabase
      .rpc('delete_user_completely', { user_id_to_delete: userId })

    if (deleteError) {
      console.error('Error in delete_user_completely:', deleteError)
      throw deleteError
    }

    if (!data) {
      throw new Error('Failed to delete user - operation returned false')
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
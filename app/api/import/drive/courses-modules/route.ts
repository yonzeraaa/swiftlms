import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title')
      .order('title')

    if (coursesError) throw coursesError

    const { data: modules, error: modulesError } = await supabase
      .from('course_modules')
      .select('id, title, course_id, code')
      .order('order_index')

    if (modulesError) throw modulesError

    return NextResponse.json({
      courses: courses || [],
      modules: modules || []
    })
  } catch (error: any) {
    console.error('Error fetching courses/modules:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar cursos e módulos' },
      { status: 500 }
    )
  }
}

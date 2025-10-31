import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildDriveImportTaskList } from '@/app/api/import-from-drive/route'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const driveUrl = searchParams.get('driveUrl')
    const courseId = searchParams.get('courseId')

    if (!driveUrl || !courseId) {
      return NextResponse.json(
        { error: 'Parâmetros driveUrl e courseId são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { tasks, summary } = await buildDriveImportTaskList({
      driveUrl,
      courseId,
      userId: user.id,
    })

    return NextResponse.json({
      summary,
      tasks,
    })
  } catch (error: any) {
    console.error('[IMPORT-LIST] Erro ao montar lista de importação', error)
    return NextResponse.json(
      { error: error?.message ?? 'Erro ao montar lista de importação' },
      { status: 500 }
    )
  }
}

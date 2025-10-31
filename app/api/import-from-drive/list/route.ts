import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildDriveImportTaskList } from '@/app/api/import-from-drive/route'
import type { DriveImportListCursor, DriveImportListResponse } from '@/types/driveImport'

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

    const resumeParam = searchParams.get('resume')
    let cursor: DriveImportListCursor | null = null

    if (resumeParam) {
      try {
        const json = Buffer.from(resumeParam, 'base64').toString('utf-8')
        cursor = JSON.parse(json)
      } catch (cursorError) {
        console.warn('[IMPORT-LIST] Cursor inválido recebido', cursorError)
        return NextResponse.json(
          { error: 'Cursor inválido' },
          { status: 400 }
        )
      }
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

    const { tasks, summary, totals, nextCursor } = await buildDriveImportTaskList({
      driveUrl,
      courseId,
      userId: user.id,
      cursor,
    })

    const nextCursorEncoded = nextCursor
      ? Buffer.from(JSON.stringify(nextCursor)).toString('base64')
      : null

    const payload: DriveImportListResponse = {
      summary,
      tasks,
      totals,
      nextCursor: nextCursorEncoded,
    }

    return NextResponse.json(payload)
  } catch (error: any) {
    console.error('[IMPORT-LIST] Erro ao montar lista de importação', error)
    return NextResponse.json(
      { error: error?.message ?? 'Erro ao montar lista de importação' },
      { status: 500 }
    )
  }
}

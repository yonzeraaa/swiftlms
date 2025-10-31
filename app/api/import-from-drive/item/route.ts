import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processDriveImportTask } from '@/app/api/import-from-drive/route'
import type { DriveImportTask } from '@/types/driveImport'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { task, courseId } = body as { task?: DriveImportTask; courseId?: string }

    if (!task || !courseId) {
      return NextResponse.json(
        { error: 'Parâmetros task e courseId são obrigatórios' },
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

    const result = await processDriveImportTask({
      task,
      courseId,
      userId: user.id,
    })

    return NextResponse.json({
      success: true,
      status: result.status,
      results: result.results,
    })
  } catch (error: any) {
    console.error('[IMPORT-ITEM] Erro ao importar item individual', error)
    return NextResponse.json(
      { error: error?.message ?? 'Erro ao importar item' },
      { status: 500 }
    )
  }
}

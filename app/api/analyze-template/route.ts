import { NextRequest, NextResponse } from 'next/server'
import { analyzeTemplate } from '@/lib/template-analyzer'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const sheet = formData.get('sheet') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Validar tamanho do arquivo (máximo 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. O tamanho máximo é 10MB.' },
        { status: 400 }
      )
    }

    // Validar tipo MIME
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx')) {
      return NextResponse.json(
        { error: 'Por favor, envie apenas arquivos Excel (.xlsx)' },
        { status: 400 }
      )
    }

    // Analisar template
    const analysis = await analyzeTemplate(file, {
      sheetName: sheet ?? undefined,
    })

    return NextResponse.json({
      success: true,
      analysis,
    })
  } catch (error) {
    console.error('Erro ao analisar template:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao analisar template',
      },
      { status: 500 }
    )
  }
}

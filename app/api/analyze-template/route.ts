import { NextRequest, NextResponse } from 'next/server'
import { analyzeTemplate } from '@/lib/template-analyzer'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Verificar se é arquivo Excel
    if (
      !file.type.includes('spreadsheet') &&
      !file.name.endsWith('.xlsx')
    ) {
      return NextResponse.json(
        { error: 'Arquivo deve ser .xlsx' },
        { status: 400 }
      )
    }

    // Analisar template
    const analysis = await analyzeTemplate(file)

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

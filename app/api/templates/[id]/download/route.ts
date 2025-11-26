import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: template, error: fetchError } = await supabase
      .from('excel_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !template) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
    }

    const bucket = template.storage_bucket || 'excel-templates'

    const { data, error } = await supabase.storage
      .from(bucket)
      .download(template.storage_path)

    if (error) {
      return NextResponse.json({ error: 'Erro ao baixar arquivo' }, { status: 500 })
    }

    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${template.name}.xlsx"`
      }
    })
  } catch (error) {
    console.error('Erro ao processar download:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * POST /api/upload-docx-temp
 * Faz upload temporário de um arquivo DOCX para análise
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    if (!file.name.endsWith('.docx')) {
      return NextResponse.json(
        { success: false, error: 'Apenas arquivos .docx são suportados' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const timestamp = Date.now()
    const uniqueId = crypto.randomUUID()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `temp-analysis/${timestamp}_${uniqueId}_${sanitizedName}`

    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('excel-templates')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: `Erro no upload: ${uploadError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      storagePath,
    })
  } catch (error: unknown) {
    console.error('Erro ao fazer upload temporário:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro no upload'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/upload-docx-temp
 * Remove arquivo temporário do storage
 */
export async function DELETE(request: NextRequest) {
  try {
    const { storagePath } = await request.json()

    if (!storagePath) {
      return NextResponse.json(
        { success: false, error: 'Caminho não informado' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase.storage
      .from('excel-templates')
      .remove([storagePath])

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Erro ao deletar arquivo temporário:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro ao deletar'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { generateCertificatePdfFromTemplate } from '@/lib/actions/certificate-docx-templates'

/**
 * POST /api/certificates/generate-docx-pdf
 * Gera um certificado em PDF a partir de um template DOCX
 */
export async function POST(request: NextRequest) {
  try {
    const { templateId, certificateId } = await request.json()

    if (!templateId || !certificateId) {
      return NextResponse.json(
        { success: false, error: 'templateId e certificateId são obrigatórios' },
        { status: 400 }
      )
    }

    // Gerar PDF
    const pdfBuffer = await generateCertificatePdfFromTemplate(templateId, certificateId)

    // Converter Buffer para Uint8Array para compatibilidade com NextResponse
    const pdfArray = new Uint8Array(pdfBuffer)

    // Retornar PDF como blob
    return new NextResponse(pdfArray, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificado-${certificateId}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Erro ao gerar certificado PDF:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao gerar certificado PDF',
      },
      { status: 500 }
    )
  }
}

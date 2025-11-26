/**
 * Serviço para conversão de DOCX para PDF usando LibreOffice
 */

import { promisify } from 'util'

// Importar libreoffice-convert
let convertAsync: ((input: Buffer, format: string, filter?: string) => Promise<Buffer>) | null = null

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const libre = require('libreoffice-convert')
  convertAsync = promisify(libre.convert) as (input: Buffer, format: string, filter?: string) => Promise<Buffer>
} catch (error) {
  console.warn('libreoffice-convert não disponível:', error)
}

/**
 * Converte um arquivo DOCX para PDF
 * @param docxBuffer Buffer do arquivo DOCX
 * @returns Buffer do arquivo PDF
 */
export async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  if (!convertAsync) {
    throw new Error(
      'Conversão DOCX para PDF não disponível. LibreOffice não está instalado ou libreoffice-convert não foi carregado.'
    )
  }

  try {
    // Converter para PDF usando LibreOffice
    const pdfBuffer = await convertAsync(docxBuffer, '.pdf', undefined)

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Falha ao converter DOCX para PDF: arquivo vazio')
    }

    return pdfBuffer
  } catch (error: any) {
    console.error('Erro ao converter DOCX para PDF:', error)
    throw new Error(`Falha na conversão para PDF: ${error.message}`)
  }
}

/**
 * Verifica se a conversão DOCX para PDF está disponível
 */
export function isDocxToPdfAvailable(): boolean {
  return convertAsync !== null
}

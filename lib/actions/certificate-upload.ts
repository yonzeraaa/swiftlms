'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { convertDocxToPdf, isDocxToPdfAvailable } from '@/lib/services/docx-to-pdf'

/**
 * Upload de certificado em DOCX (com conversão automática para PDF)
 */
export async function uploadCertificateFile(
  certificateId: string,
  file: File,
  convertToPdf: boolean = true
) {
  const supabase = await createClient()

  try {
    // Validar tipo de arquivo
    const isDocx = file.name.endsWith('.docx') || file.type.includes('wordprocessingml')
    const isPdf = file.name.endsWith('.pdf') || file.type === 'application/pdf'

    if (!isDocx && !isPdf) {
      throw new Error('Apenas arquivos DOCX ou PDF são suportados')
    }

    // Buscar certificado
    const { data: certificate, error: certError } = await supabase
      .from('certificates')
      .select('*')
      .eq('id', certificateId)
      .single()

    if (certError || !certificate) {
      throw new Error('Certificado não encontrado')
    }

    const bucket = 'certificates'
    const timestamp = Date.now()
    let filePath = ''
    let fileType: 'docx' | 'pdf' | 'generated' = 'generated'
    let uploadBuffer: Buffer | ArrayBuffer

    if (isDocx) {
      fileType = 'docx'
      const arrayBuffer = await file.arrayBuffer()
      uploadBuffer = arrayBuffer

      // Upload do DOCX original
      const docxPath = `${certificate.user_id}/${certificateId}_${timestamp}.docx`
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(docxPath, uploadBuffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Erro ao fazer upload do DOCX: ${uploadError.message}`)
      }

      filePath = docxPath

      // Converter para PDF se solicitado e disponível
      if (convertToPdf && isDocxToPdfAvailable()) {
        try {
          const docxBuffer = Buffer.from(arrayBuffer)
          const pdfBuffer = await convertDocxToPdf(docxBuffer)

          // Upload do PDF convertido
          const pdfPath = `${certificate.user_id}/${certificateId}_${timestamp}.pdf`
          const { error: pdfUploadError } = await supabase.storage
            .from(bucket)
            .upload(pdfPath, pdfBuffer, {
              contentType: 'application/pdf',
              upsert: false,
            })

          if (!pdfUploadError) {
            // Se conversão foi bem-sucedida, usar PDF como arquivo principal
            filePath = pdfPath
            fileType = 'pdf'
          }
        } catch (conversionError) {
          console.warn('Conversão para PDF falhou, mantendo DOCX:', conversionError)
        }
      }
    } else if (isPdf) {
      fileType = 'pdf'
      const arrayBuffer = await file.arrayBuffer()
      uploadBuffer = arrayBuffer

      // Upload direto do PDF
      const pdfPath = `${certificate.user_id}/${certificateId}_${timestamp}.pdf`
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(pdfPath, uploadBuffer, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Erro ao fazer upload do PDF: ${uploadError.message}`)
      }

      filePath = pdfPath
    }

    // Atualizar certificado com informações do arquivo
    const { error: updateError } = await supabase
      .from('certificates')
      .update({
        file_path: filePath,
        file_type: fileType,
        storage_bucket: bucket,
        updated_at: new Date().toISOString(),
      })
      .eq('id', certificateId)

    if (updateError) {
      // Rollback: deletar arquivo do storage
      await supabase.storage.from(bucket).remove([filePath])
      throw new Error(`Erro ao atualizar certificado: ${updateError.message}`)
    }

    revalidatePath('/dashboard/certificates')

    return {
      success: true,
      filePath,
      fileType,
    }
  } catch (error: any) {
    console.error('Erro ao fazer upload de certificado:', error)
    throw error
  }
}

/**
 * Download de arquivo de certificado
 */
export async function downloadCertificateFile(certificateId: string) {
  const supabase = await createClient()

  try {
    // Buscar certificado
    const { data: certificate, error: certError } = await supabase
      .from('certificates')
      .select('*')
      .eq('id', certificateId)
      .single()

    if (certError || !certificate) {
      throw new Error('Certificado não encontrado')
    }

    const cert = certificate as any

    if (!cert.file_path) {
      throw new Error('Certificado não possui arquivo anexado')
    }

    const bucket = cert.storage_bucket || 'certificates'

    // Download do arquivo
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(cert.file_path)

    if (downloadError || !fileData) {
      throw new Error(`Erro ao baixar arquivo: ${downloadError?.message}`)
    }

    const fileExtension = cert.file_type === 'pdf' ? 'pdf' : 'docx'
    const fileName = `certificado_${certificate.certificate_number}.${fileExtension}`

    return {
      blob: fileData,
      name: fileName,
      type: cert.file_type,
    }
  } catch (error: any) {
    console.error('Erro ao baixar certificado:', error)
    throw error
  }
}

/**
 * Deletar arquivo de certificado
 */
export async function deleteCertificateFile(certificateId: string) {
  const supabase = await createClient()

  try {
    // Buscar certificado
    const { data: certificate, error: certError } = await supabase
      .from('certificates')
      .select('*')
      .eq('id', certificateId)
      .single()

    if (certError || !certificate) {
      throw new Error('Certificado não encontrado')
    }

    const cert = certificate as any

    if (!cert.file_path) {
      return { success: true, message: 'Certificado não possui arquivo' }
    }

    const bucket = cert.storage_bucket || 'certificates'

    // Deletar arquivo do storage
    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([cert.file_path])

    if (deleteError) {
      console.error('Erro ao deletar arquivo:', deleteError)
    }

    // Remover referência do banco
    const { error: updateError } = await supabase
      .from('certificates')
      .update({
        file_path: null,
        file_type: null,
        storage_bucket: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', certificateId)

    if (updateError) {
      throw new Error(`Erro ao atualizar certificado: ${updateError.message}`)
    }

    revalidatePath('/dashboard/certificates')

    return { success: true }
  } catch (error: any) {
    console.error('Erro ao deletar arquivo de certificado:', error)
    throw error
  }
}

/**
 * Verifica se conversão DOCX para PDF está disponível
 */
export async function checkDocxToPdfAvailability() {
  return {
    available: isDocxToPdfAvailable(),
  }
}

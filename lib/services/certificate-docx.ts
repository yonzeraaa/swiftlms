/**
 * Serviço para geração de certificados DOCX
 */
import 'server-only'

import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { CertificateDocxData, FieldMapping, validateCertificateData } from '@/types/certificate-docx'
import { createClient } from '@/lib/supabase/server'
import { convertDocxToPdf } from './docx-to-pdf'

/**
 * Aplica transformações nos valores
 */
function applyTransform(
  value: string | number | undefined,
  transform?: string
): string {
  if (value === undefined || value === null) return ''

  const strValue = String(value)

  switch (transform) {
    case 'uppercase':
      return strValue.toUpperCase()
    case 'lowercase':
      return strValue.toLowerCase()
    case 'capitalize':
      return strValue.charAt(0).toUpperCase() + strValue.slice(1).toLowerCase()
    case 'date-short':
      // Formato DD/MM/YYYY
      try {
        const date = new Date(strValue)
        return date.toLocaleDateString('pt-BR')
      } catch {
        return strValue
      }
    case 'date-long':
      // Formato "01 de Janeiro de 2025"
      try {
        const date = new Date(strValue)
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      } catch {
        return strValue
      }
    default:
      return strValue
  }
}

/**
 * Obtém valor de um caminho no objeto de dados
 */
function getValueByPath(data: any, path: string): any {
  const parts = path.split('.')
  let value = data

  for (const part of parts) {
    if (value === undefined || value === null) return undefined
    value = value[part]
  }

  return value
}

/**
 * Monta objeto de dados para substituição no template
 */
export function buildTemplateData(
  certificateData: CertificateDocxData,
  mappings: FieldMapping[]
): Record<string, string> {
  const data: Record<string, string> = {}

  mappings.forEach((mapping) => {
    let value: string

    if (mapping.fixedValue) {
      // Valor fixo tem prioridade
      value = mapping.fixedValue
    } else if (mapping.source) {
      // Obter valor da fonte de dados
      const sourceValue = getValueByPath(certificateData, mapping.source)
      value = applyTransform(sourceValue, mapping.transform)
    } else {
      value = ''
    }

    // Usar o nome do placeholder sem prefixo de objeto
    // Ex: "student.full_name" vira "student" com objeto { full_name: "valor" }
    const parts = mapping.placeholder.split('.')

    if (parts.length === 1) {
      data[mapping.placeholder] = value
    } else {
      // Criar estrutura aninhada
      const [objName, ...rest] = parts
      if (!data[objName]) {
        data[objName] = {} as any
      }

      let current: any = data[objName]
      for (let i = 0; i < rest.length - 1; i++) {
        if (!current[rest[i]]) {
          current[rest[i]] = {}
        }
        current = current[rest[i]]
      }
      current[rest[rest.length - 1]] = value
    }
  })

  return data
}

/**
 * Gera certificado DOCX a partir de template
 */
export async function generateCertificateDocx(
  templateId: string,
  certificateData: CertificateDocxData
): Promise<Buffer> {
  // Validar dados do certificado
  const validation = validateCertificateData(certificateData)
  if (!validation.success) {
    const errors = validation.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
    throw new Error(`Dados do certificado inválidos: ${errors}`)
  }

  const supabase = await createClient()

  // Buscar template
  const { data: template, error: templateError } = await supabase
    .from('excel_templates')
    .select('*')
    .eq('id', templateId)
    .eq('category', 'certificate-docx')
    .single()

  if (templateError || !template) {
    throw new Error('Template não encontrado')
  }

  // Baixar arquivo do template
  const { data: fileData, error: fileError } = await supabase.storage
    .from(template.storage_bucket)
    .download(template.storage_path)

  if (fileError || !fileData) {
    throw new Error('Erro ao baixar template')
  }

  // Converter para buffer
  const arrayBuffer = await fileData.arrayBuffer()
  const content = Buffer.from(arrayBuffer)

  // Obter mapeamentos do metadata
  const metadata = template.metadata as any
  const mappings = (metadata?.mappings || []) as FieldMapping[]

  // Montar dados para substituição
  const data = buildTemplateData(certificateData, mappings)

  // Processar template
  try {
    const zip = new PizZip(content)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    })

    // Substituir dados
    doc.render(data)

    // Gerar buffer do documento final
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })

    return buf
  } catch (error: any) {
    console.error('Erro ao processar template DOCX:', error)
    throw new Error(`Erro ao gerar certificado: ${error.message}`)
  }
}

/**
 * Gera certificado PDF a partir de template (DOCX → PDF)
 */
export async function generateCertificatePdf(
  templateId: string,
  certificateData: CertificateDocxData
): Promise<Buffer> {
  // Primeiro gerar o DOCX
  const docxBuffer = await generateCertificateDocx(templateId, certificateData)

  // Converter para PDF
  try {
    const pdfBuffer = await convertDocxToPdf(docxBuffer)
    return pdfBuffer
  } catch (error: any) {
    console.error('Erro ao converter certificado para PDF:', error)
    throw new Error(`Erro ao gerar certificado em PDF: ${error.message}`)
  }
}

/**
 * Converte dados de certificado do banco para formato DOCX
 */
export function certificateToDocxData(certificate: any): CertificateDocxData {
  return {
    student: {
      full_name: certificate.user?.full_name || 'Aluno',
      cpf: certificate.user?.cpf || '',
      rg: certificate.user?.rg || '',
      email: certificate.user?.email || '',
    },
    course: {
      title: certificate.course?.title || 'Curso',
      duration_hours: certificate.course_hours || certificate.course?.duration_hours || 0,
      start_date: certificate.course?.start_date || '',
      end_date: certificate.completed_at || certificate.course?.end_date || '',
    },
    certificate: {
      number: certificate.certificate_number,
      issue_date: certificate.issued_at || new Date().toISOString(),
      verification_code: certificate.verification_code,
      grade: certificate.grade || certificate.final_grade,
      certificate_type: certificate.certificate_type || 'technical',
    },
    institution: {
      name: 'SwiftEDU',
      cnpj: '',
      address: '',
    },
    signatures: {
      director_name: certificate.director_name || '',
      director_title: certificate.director_title || 'Diretor',
      coordinator_name: certificate.instructor_name || '',
      coordinator_title: 'Coordenador',
    },
  }
}

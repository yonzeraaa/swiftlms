/**
 * Tipos para templates DOCX de certificados
 */

export type CertificateKind = 'technical' | 'lato-sensu' | 'all'

/**
 * Placeholder extraído do template DOCX
 */
export interface DocxPlaceholder {
  /** Nome do placeholder (ex: student.full_name) */
  name: string
  /** Tipo de dado esperado */
  type: 'string' | 'number' | 'date'
  /** Se é obrigatório */
  required: boolean
  /** Fonte de dados mapeada */
  source?: string
  /** Formato aplicado (ex: uppercase, lowercase, date-format) */
  format?: string
  /** Valor padrão se não houver dados */
  defaultValue?: string
}

/**
 * Mapeamento de campo
 */
export interface FieldMapping {
  /** Placeholder no documento */
  placeholder: string
  /** Campo de origem dos dados */
  source: string
  /** Transformação a aplicar */
  transform?: 'uppercase' | 'lowercase' | 'capitalize' | 'date-short' | 'date-long'
  /** Valor fixo (sobrescreve source se definido) */
  fixedValue?: string
}

/**
 * Dados para geração de certificado
 */
export interface CertificateDocxData {
  student: {
    full_name: string
    cpf?: string
    rg?: string
    email?: string
  }
  course: {
    title: string
    duration_hours: number
    start_date?: string
    end_date?: string
  }
  certificate: {
    number: string
    issue_date: string
    verification_code: string
    grade?: number
    certificate_type: 'technical' | 'lato-sensu'
  }
  institution: {
    name: string
    cnpj?: string
    address?: string
  }
  signatures: {
    director_name?: string
    director_title?: string
    coordinator_name?: string
    coordinator_title?: string
  }
}

/**
 * Campos disponíveis para certificados
 */
export const CERTIFICATE_DOCX_FIELDS = {
  // Dados do aluno
  'student.full_name': { description: 'Nome completo do aluno', type: 'string', required: true },
  'student.cpf': { description: 'CPF do aluno', type: 'string', required: false },
  'student.rg': { description: 'RG do aluno', type: 'string', required: false },
  'student.email': { description: 'E-mail do aluno', type: 'string', required: false },

  // Dados do curso
  'course.title': { description: 'Título do curso', type: 'string', required: true },
  'course.duration_hours': { description: 'Carga horária', type: 'number', required: true },
  'course.start_date': { description: 'Data de início', type: 'date', required: false },
  'course.end_date': { description: 'Data de conclusão', type: 'date', required: false },

  // Dados do certificado
  'certificate.number': { description: 'Número do certificado', type: 'string', required: true },
  'certificate.issue_date': { description: 'Data de emissão', type: 'date', required: true },
  'certificate.verification_code': { description: 'Código de verificação', type: 'string', required: true },
  'certificate.grade': { description: 'Nota final', type: 'number', required: false },
  'certificate.type': { description: 'Tipo de certificado', type: 'string', required: true },

  // Dados da instituição
  'institution.name': { description: 'Nome da instituição', type: 'string', required: true },
  'institution.cnpj': { description: 'CNPJ da instituição', type: 'string', required: false },
  'institution.address': { description: 'Endereço da instituição', type: 'string', required: false },

  // Assinaturas
  'signatures.director_name': { description: 'Nome do diretor', type: 'string', required: false },
  'signatures.director_title': { description: 'Cargo do diretor', type: 'string', required: false },
  'signatures.coordinator_name': { description: 'Nome do coordenador', type: 'string', required: false },
  'signatures.coordinator_title': { description: 'Cargo do coordenador', type: 'string', required: false },
} as const

/**
 * Template DOCX de certificado
 */
export interface CertificateDocxTemplate {
  id: string
  name: string
  description: string | null
  category: 'certificate-docx'
  certificate_kind: CertificateKind
  storage_path: string
  storage_bucket: string
  placeholders: DocxPlaceholder[]
  validation_warnings: string[] | null
  is_active: boolean
  created_at: string
  created_by: string
  metadata: {
    version?: string
    mappings?: FieldMapping[]
  }
}

/**
 * Resultado da análise de template DOCX
 */
export interface DocxAnalysisResult {
  success: boolean
  placeholders: DocxPlaceholder[]
  warnings: string[]
  suggestions: FieldMapping[]
  error?: string
}

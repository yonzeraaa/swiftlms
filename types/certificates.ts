/**
 * Tipos e interfaces para o sistema de certificados
 */

export type CertificateType = 'technical' | 'lato-sensu'

/**
 * Dados necessários para renderizar um certificado
 */
export interface CertificateData {
  certificate_number: string
  verification_code: string
  certificate_type: CertificateType | null
  course_hours: number | null
  grade?: number | null
  issued_at: string | null
  instructor_name?: string | null
  user: {
    full_name: string | null
  }
  course: {
    title: string | null
    duration_hours?: number | null
  }
}

/**
 * Props para o componente CertificateTemplate
 */
export interface CertificateTemplateProps {
  certificate: CertificateData
  elementId: string
  showGrade?: boolean
  customTemplate?: string
}

/**
 * Configuração visual de um tipo de certificado
 */
export interface CertificateTypeConfig {
  title: string
  subtitle: string
  typeLabel: string
  accentColor: string
  badgeColor: string
  iconColor: string
}

/**
 * Metadados da instituição para certificados
 */
export interface InstitutionMetadata {
  name: string
  logo?: string
  address?: string
  registrationNumber?: string
}

/**
 * Constantes de configuração por tipo de certificado
 */
export const CERTIFICATE_TYPE_CONFIG: Record<CertificateType, CertificateTypeConfig> = {
  technical: {
    title: 'CERTIFICADO',
    subtitle: 'DE CONCLUSÃO',
    typeLabel: 'Certificado Técnico de Conclusão',
    accentColor: '#FFD700',
    badgeColor: '#22c55e',
    iconColor: '#fbbf24'
  },
  'lato-sensu': {
    title: 'CERTIFICADO',
    subtitle: 'DE PÓS-GRADUAÇÃO LATO SENSU',
    typeLabel: 'Certificado de Pós-Graduação Lato Sensu',
    accentColor: '#FFD700',
    badgeColor: '#a855f7',
    iconColor: '#fbbf24'
  }
}

/**
 * Dimensões padrão do certificado para geração de PDF
 */
export const CERTIFICATE_DIMENSIONS = {
  width: 1100,
  height: 850,
  padding: 60
} as const

/**
 * Metadados padrão da instituição
 */
export const DEFAULT_INSTITUTION: InstitutionMetadata = {
  name: 'SwiftEDU',
  registrationNumber: '00.000.000/0001-00'
}

/**
 * Template customizado de certificado (uploadado pelo admin)
 */
export interface CertificateTemplate {
  id: string
  name: string
  description: string | null
  certificate_type: CertificateType | 'all'
  html_content: string
  css_content: string | null
  storage_path: string | null
  storage_bucket: string
  is_active: boolean
  is_default: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Variáveis disponíveis para substituição nos templates
 */
export interface CertificateTemplateVariables {
  student_name: string
  course_title: string
  course_hours: number
  certificate_number: string
  verification_code: string
  issue_date: string
  certificate_type: string
  instructor_name?: string
  grade?: number
  institution_name: string
}

/**
 * Mapeamento de variáveis para placeholders
 */
export const TEMPLATE_VARIABLES: Record<keyof CertificateTemplateVariables, { placeholder: string; description: string; example: string }> = {
  student_name: {
    placeholder: '{{student_name}}',
    description: 'Nome completo do aluno',
    example: 'João da Silva'
  },
  course_title: {
    placeholder: '{{course_title}}',
    description: 'Título do curso',
    example: 'Desenvolvimento Web Full Stack'
  },
  course_hours: {
    placeholder: '{{course_hours}}',
    description: 'Carga horária do curso',
    example: '120'
  },
  certificate_number: {
    placeholder: '{{certificate_number}}',
    description: 'Número do certificado',
    example: 'CERT-2025-001234'
  },
  verification_code: {
    placeholder: '{{verification_code}}',
    description: 'Código de verificação',
    example: 'ABC123XYZ789'
  },
  issue_date: {
    placeholder: '{{issue_date}}',
    description: 'Data de emissão',
    example: '17 de novembro de 2025'
  },
  certificate_type: {
    placeholder: '{{certificate_type}}',
    description: 'Tipo do certificado',
    example: 'Certificado Técnico de Conclusão'
  },
  instructor_name: {
    placeholder: '{{instructor_name}}',
    description: 'Nome do instrutor responsável (opcional)',
    example: 'Prof. Maria Santos'
  },
  grade: {
    placeholder: '{{grade}}',
    description: 'Aproveitamento do aluno (opcional, apenas admin)',
    example: '95.5'
  },
  institution_name: {
    placeholder: '{{institution_name}}',
    description: 'Nome da instituição',
    example: 'SwiftEDU'
  }
}

/**
 * Template HTML padrão para certificados
 */
export const DEFAULT_CERTIFICATE_HTML = `
<div style="width: 1100px; height: 850px; background: linear-gradient(135deg, #001a33 0%, #002244 100%); padding: 60px; display: flex; flex-direction: column; justify-content: center; font-family: 'Open Sans', sans-serif;">
  <div style="text-align: center; padding-top: 40px;">
    <!-- Header -->
    <div style="margin-bottom: 30px;">
      <h1 style="font-size: 48px; font-weight: bold; margin-bottom: 10px; color: #FFD700; letter-spacing: 3px;">CERTIFICADO</h1>
      <p style="font-size: 18px; color: #FFD700; letter-spacing: 2px;">DE CONCLUSÃO</p>
    </div>

    <!-- Content -->
    <div style="margin-top: 30px; margin-bottom: 30px;">
      <p style="color: #FFD700; opacity: 0.8; font-size: 16px; margin-bottom: 15px;">Certificamos que</p>
      <p style="color: #FFD700; font-size: 28px; font-weight: bold; margin-bottom: 20px;">{{student_name}}</p>
      <p style="color: #FFD700; opacity: 0.8; font-size: 16px; margin-bottom: 15px;">concluiu com êxito o curso de</p>
      <p style="font-size: 32px; font-weight: bold; margin-bottom: 30px; color: #FFD700; line-height: 1.2;">{{course_title}}</p>
      <p style="color: #FCD34D; text-transform: uppercase; letter-spacing: 3px; font-size: 14px; margin-bottom: 20px;">{{certificate_type}}</p>

      <!-- Course Hours -->
      <div style="display: flex; justify-content: center; gap: 60px; margin-top: 30px; margin-bottom: 30px;">
        <div>
          <p style="color: #FFD700; opacity: 0.7; font-size: 14px; margin-bottom: 5px;">Carga Horária</p>
          <p style="color: #FFD700; font-size: 20px; font-weight: bold;">{{course_hours}} horas</p>
        </div>
      </div>

      <p style="color: #FFD700; opacity: 0.8; font-size: 16px; margin-top: 20px;">Emitido em {{issue_date}}</p>
    </div>

    <!-- Verification -->
    <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid rgba(255, 215, 0, 0.3);">
      <p style="color: #00ff00; font-size: 14px; margin-bottom: 10px;">✓ Certificado Autêntico</p>
      <p style="color: #FFD700; opacity: 0.7; font-size: 12px; margin-bottom: 5px;">Nº {{certificate_number}}</p>
      <p style="color: #FFD700; opacity: 0.7; font-size: 12px;">Código de Verificação: {{verification_code}}</p>
    </div>

    <!-- Instructor Signature (if present) -->
    {{#if instructor_name}}
    <div style="margin-top: 40px; display: flex; justify-content: center;">
      <div style="text-align: center;">
        <div style="border-top: 2px solid rgba(255, 215, 0, 0.6); width: 250px; margin-bottom: 10px;"></div>
        <p style="color: #FFD700; font-size: 14px; font-weight: bold; margin-bottom: 3px;">{{instructor_name}}</p>
        <p style="color: #FFD700; font-size: 12px; opacity: 0.7;">Instrutor Responsável</p>
      </div>
    </div>
    {{/if}}
  </div>
</div>
`.trim()

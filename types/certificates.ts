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

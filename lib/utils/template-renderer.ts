import { CertificateTemplateVariables, CERTIFICATE_TYPE_CONFIG } from '@/types/certificates'
import { CertificateData } from '@/types/certificates'

/**
 * Formata data para exibição em português
 */
function formatDate(dateString: string): string {
  if (!dateString) return ''

  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

/**
 * Converte dados do certificado para variáveis do template
 */
export function certificateDataToVariables(
  certificate: CertificateData,
  showGrade: boolean = false
): CertificateTemplateVariables {
  const config = CERTIFICATE_TYPE_CONFIG[certificate.certificate_type || 'technical']

  return {
    student_name: certificate.user.full_name || 'Aluno',
    course_title: certificate.course.title || 'Curso',
    course_hours: certificate.course_hours || certificate.course.duration_hours || 0,
    certificate_number: certificate.certificate_number,
    verification_code: certificate.verification_code,
    issue_date: formatDate(certificate.issued_at || ''),
    certificate_type: config.typeLabel,
    instructor_name: certificate.instructor_name || undefined,
    grade: showGrade && certificate.grade !== null && certificate.grade !== undefined
      ? certificate.grade
      : undefined,
    institution_name: 'SwiftEDU'
  }
}

/**
 * Substitui placeholders {{variable}} no template HTML
 */
export function renderTemplate(htmlContent: string, variables: CertificateTemplateVariables): string {
  let rendered = htmlContent

  // Substituir variáveis simples
  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const placeholder = `{{${key}}}`
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      rendered = rendered.replace(regex, String(value))
    }
  })

  // Processar condicionais {{#if variable}}...{{/if}}
  rendered = processConditionals(rendered, variables)

  return rendered
}

/**
 * Processa blocos condicionais no template
 */
function processConditionals(html: string, variables: CertificateTemplateVariables): string {
  let processed = html

  // Regex para capturar {{#if variable}}...{{/if}}
  const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g

  processed = processed.replace(conditionalRegex, (match, variable, content) => {
    const value = variables[variable as keyof CertificateTemplateVariables]
    // Se a variável existe e não é vazia, retorna o conteúdo
    if (value !== undefined && value !== null && value !== '') {
      return content
    }
    // Caso contrário, remove o bloco
    return ''
  })

  return processed
}

/**
 * Sanitiza HTML para prevenir XSS
 */
export function sanitizeHTML(html: string): string {
  // Remove scripts
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove event handlers inline
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')

  // Remove javascript: URLs
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '')

  return sanitized
}

/**
 * Valida template HTML
 */
export function validateTemplate(html: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Verifica se tem conteúdo
  if (!html || html.trim().length === 0) {
    errors.push('Template vazio')
  }

  // Verifica dimensões (deve ter 1100x850)
  if (!html.includes('1100px') || !html.includes('850px')) {
    errors.push('Template deve ter dimensões 1100px x 850px')
  }

  // Verifica se contém placeholders básicos
  const requiredPlaceholders = ['{{student_name}}', '{{course_title}}', '{{certificate_number}}']
  requiredPlaceholders.forEach(placeholder => {
    if (!html.includes(placeholder)) {
      errors.push(`Placeholder obrigatório ausente: ${placeholder}`)
    }
  })

  // Verifica se não tem scripts
  if (/<script/i.test(html)) {
    errors.push('Templates não podem conter tags <script>')
  }

  // Verifica se não tem event handlers
  if (/\son\w+\s*=/i.test(html)) {
    errors.push('Templates não podem conter event handlers (onclick, onload, etc)')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Renderiza template com dados do certificado
 */
export function renderCertificateTemplate(
  template: string,
  certificate: CertificateData,
  showGrade: boolean = false
): string {
  const variables = certificateDataToVariables(certificate, showGrade)
  const sanitized = sanitizeHTML(template)
  return renderTemplate(sanitized, variables)
}

import { Award, Shield } from 'lucide-react'
import { CertificateTemplateProps, CERTIFICATE_TYPE_CONFIG } from '@/types/certificates'

/**
 * Formata data para exibição no certificado
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
 * Template único de certificado para técnico e lato sensu
 *
 * Renderiza um certificado em HTML/CSS que será capturado pelo html2canvas
 * e convertido em PDF via jsPDF.
 *
 * @param certificate - Dados do certificado
 * @param elementId - ID do elemento HTML (certificate-pdf ou certificate-pdf-admin)
 * @param showGrade - Se deve exibir o campo de aproveitamento (apenas admin)
 */
export function CertificateTemplate({
  certificate,
  elementId,
  showGrade = false
}: CertificateTemplateProps) {
  const config = CERTIFICATE_TYPE_CONFIG[certificate.certificate_type || 'technical']
  const courseHours = certificate.course_hours || certificate.course?.duration_hours || 0

  return (
    <div
      id={elementId}
      style={{
        width: '1100px',
        height: '850px',
        background: 'linear-gradient(135deg, #001a33 0%, #002244 100%)',
        padding: '60px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        fontFamily: 'Open Sans, sans-serif'
      }}
    >
      {/* Certificate Content */}
      <div style={{ textAlign: 'center', paddingTop: '40px' }}>
        {/* Logo/Header */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                backgroundColor: config.accentColor,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 10px 30px rgba(255, 215, 0, 0.3)`
              }}
            >
              <Award style={{ width: '40px', height: '40px', color: '#001a33' }} />
            </div>
          </div>
          <h1
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              marginBottom: '10px',
              color: config.accentColor,
              letterSpacing: '3px'
            }}
          >
            {config.title}
          </h1>
          <p style={{ fontSize: '18px', color: config.accentColor, letterSpacing: '2px' }}>
            {config.subtitle}
          </p>
        </div>

        {/* Certificate Text */}
        <div style={{ marginTop: '30px', marginBottom: '30px' }}>
          <p style={{ color: config.accentColor, opacity: 0.8, fontSize: '16px', marginBottom: '15px' }}>
            Certificamos que
          </p>
          <p style={{ color: config.accentColor, fontSize: '28px', fontWeight: 'bold', marginBottom: '20px' }}>
            {certificate.user.full_name || 'Aluno'}
          </p>
          <p style={{ color: config.accentColor, opacity: 0.8, fontSize: '16px', marginBottom: '15px' }}>
            concluiu com êxito o curso de
          </p>
          <p
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              marginBottom: '30px',
              color: config.accentColor,
              lineHeight: '1.2'
            }}
          >
            {certificate.course.title || 'Curso'}
          </p>
          <p
            style={{
              color: '#FCD34D',
              textTransform: 'uppercase',
              letterSpacing: '3px',
              fontSize: '14px',
              marginBottom: '20px'
            }}
          >
            {config.typeLabel}
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '60px',
              marginTop: '30px',
              marginBottom: '30px'
            }}
          >
            <div>
              <p style={{ color: config.accentColor, opacity: 0.7, fontSize: '14px', marginBottom: '5px' }}>
                Carga Horária
              </p>
              <p style={{ color: config.accentColor, fontSize: '20px', fontWeight: 'bold' }}>
                {courseHours} horas
              </p>
            </div>
            {showGrade && certificate.grade !== null && certificate.grade !== undefined && (
              <div>
                <p style={{ color: config.accentColor, opacity: 0.7, fontSize: '14px', marginBottom: '5px' }}>
                  Aproveitamento
                </p>
                <p style={{ color: config.accentColor, fontSize: '20px', fontWeight: 'bold' }}>
                  {certificate.grade.toFixed(1)}%
                </p>
              </div>
            )}
          </div>

          <p style={{ color: config.accentColor, opacity: 0.8, fontSize: '16px', marginTop: '20px' }}>
            Emitido em {formatDate(certificate.issued_at || '')}
          </p>
        </div>

        {/* Verification */}
        <div
          style={{
            marginTop: '40px',
            paddingTop: '30px',
            borderTop: `1px solid rgba(255, 215, 0, 0.3)`
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: showGrade ? '7px' : '8px',
              marginBottom: showGrade ? '18px' : '10px'
            }}
          >
            <Shield
              style={{
                width: '18px',
                height: '18px',
                color: '#00ff00',
                display: 'inline-block',
                marginTop: '6px'
              }}
            />
            <span style={{ color: '#00ff00', fontSize: '14px', display: 'inline-block' }}>
              Certificado Autêntico
            </span>
          </div>
          <p style={{ color: config.accentColor, opacity: 0.7, fontSize: '12px', marginBottom: '5px' }}>
            Nº {certificate.certificate_number}
          </p>
          <p style={{ color: config.accentColor, opacity: 0.7, fontSize: '12px' }}>
            Código de Verificação: {certificate.verification_code}
          </p>
        </div>

        {/* Instructor Signature */}
        {certificate.instructor_name && (
          <div
            style={{
              marginTop: '40px',
              display: 'flex',
              justifyContent: 'center'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  borderTop: showGrade ? '1px solid rgba(255, 215, 0, 0.6)' : '2px solid rgba(255, 215, 0, 0.6)',
                  width: '250px',
                  marginBottom: '10px'
                }}
              ></div>
              <p
                style={{
                  color: config.accentColor,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '3px'
                }}
              >
                {certificate.instructor_name}
              </p>
              <p
                style={{
                  color: config.accentColor,
                  fontSize: '12px',
                  opacity: 0.7
                }}
              >
                Instrutor Responsável
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'

interface CertificatePageProps {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: CertificatePageProps): Promise<Metadata> {
  const { code } = await params
  return {
    title: `Verificar Certificado - ${code}`,
    description: 'Verificação de autenticidade de certificado digital',
  }
}

export default async function CertificateVerificationPage({ params }: CertificatePageProps) {
  const { code } = await params
  const adminClient = createAdminClient()

  const { data: certificate } = await adminClient
    .from('certificates')
    .select(`
      id,
      certificate_number,
      verification_code,
      certificate_type,
      status,
      issued_at,
      conclusion_date,
      grade,
      course_hours,
      pdf_path,
      metadata,
      user:profiles!certificates_user_id_fkey(full_name),
      course:courses!certificates_course_id_fkey(title)
    `)
    .eq('verification_code', code.toUpperCase())
    .single()

  if (!certificate) {
    notFound()
  }

  const studentName = (certificate.user as { full_name: string })?.full_name || 'Nome não disponível'
  const courseName = (certificate.course as { title: string })?.title || 'Curso não disponível'
  const metadata = certificate.metadata as {
    issue_date_br?: string
    conclusion_date_br?: string
  } | null

  // Gerar URL assinada para download (se tiver pdf_path)
  let downloadUrl: string | null = null
  if (certificate.pdf_path) {
    const { data: signedUrl } = await adminClient.storage
      .from('certificados')
      .createSignedUrl(certificate.pdf_path, 3600)
    downloadUrl = signedUrl?.signedUrl || null
  }

  const isValid = certificate.status === 'issued'
  const isLatoSensu = certificate.certificate_type === 'lato-sensu'

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-100 to-amber-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-6">
              <h1 className="text-3xl font-bold text-amber-900">SwiftLMS</h1>
            </Link>
            <h2 className="text-xl text-stone-600">Verificador de Autenticidade</h2>
          </div>

          {/* Card de Verificação */}
          <div className="bg-white rounded-2xl shadow-xl border border-amber-200 overflow-hidden">
            {/* Status Banner */}
            <div className={`px-6 py-4 ${isValid ? 'bg-emerald-500' : 'bg-red-500'}`}>
              <div className="flex items-center justify-center gap-3">
                {isValid ? (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="text-xl font-semibold text-white">
                  {isValid ? 'Certificado Válido' : 'Certificado Inválido'}
                </span>
              </div>
            </div>

            {/* Informações do Certificado */}
            <div className="p-6 space-y-6">
              {/* Código de Verificação */}
              <div className="text-center pb-4 border-b border-stone-200">
                <p className="text-sm text-stone-500 mb-1">Código de Verificação</p>
                <p className="text-2xl font-mono font-bold text-amber-800">{certificate.verification_code}</p>
              </div>

              {/* Tipo de Certificado */}
              <div className="flex justify-center">
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                  isLatoSensu
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {isLatoSensu ? 'Pós-Graduação Lato Sensu' : 'Certificado Técnico'}
                </span>
              </div>

              {/* Dados do Certificado */}
              <div className="grid gap-4">
                <div className="bg-stone-50 rounded-lg p-4">
                  <p className="text-sm text-stone-500 mb-1">Nome do Aluno</p>
                  <p className="text-lg font-semibold text-stone-800">{studentName}</p>
                </div>

                <div className="bg-stone-50 rounded-lg p-4">
                  <p className="text-sm text-stone-500 mb-1">Curso</p>
                  <p className="text-lg font-semibold text-stone-800">{courseName}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {certificate.conclusion_date && (
                    <div className="bg-stone-50 rounded-lg p-4">
                      <p className="text-sm text-stone-500 mb-1">Data de Conclusão</p>
                      <p className="text-lg font-semibold text-stone-800">
                        {metadata?.conclusion_date_br || new Date(certificate.conclusion_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}

                  {certificate.issued_at && (
                    <div className="bg-stone-50 rounded-lg p-4">
                      <p className="text-sm text-stone-500 mb-1">Data de Emissão</p>
                      <p className="text-lg font-semibold text-stone-800">
                        {metadata?.issue_date_br || new Date(certificate.issued_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {certificate.course_hours && (
                    <div className="bg-stone-50 rounded-lg p-4">
                      <p className="text-sm text-stone-500 mb-1">Carga Horária</p>
                      <p className="text-lg font-semibold text-stone-800">{certificate.course_hours} horas</p>
                    </div>
                  )}

                  {certificate.grade !== null && (
                    <div className="bg-stone-50 rounded-lg p-4">
                      <p className="text-sm text-stone-500 mb-1">Média Geral</p>
                      <p className="text-lg font-semibold text-stone-800">
                        {typeof certificate.grade === 'number'
                          ? certificate.grade.toFixed(1).replace('.', ',')
                          : certificate.grade}
                      </p>
                    </div>
                  )}
                </div>

                {certificate.certificate_number && (
                  <div className="bg-stone-50 rounded-lg p-4">
                    <p className="text-sm text-stone-500 mb-1">Número do Certificado</p>
                    <p className="text-lg font-mono font-semibold text-stone-800">{certificate.certificate_number}</p>
                  </div>
                )}
              </div>

              {/* Botão de Download */}
              {downloadUrl && isValid && (
                <div className="pt-4">
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Baixar Certificado (PDF)
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-stone-50 px-6 py-4 border-t border-stone-200">
              <p className="text-xs text-center text-stone-500">
                Este documento foi emitido digitalmente pelo SwiftLMS.
                A autenticidade pode ser verificada através do código acima.
              </p>
            </div>
          </div>

          {/* Link para home */}
          <div className="text-center mt-8">
            <Link href="/" className="text-amber-700 hover:text-amber-900 font-medium">
              Voltar para a página inicial
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

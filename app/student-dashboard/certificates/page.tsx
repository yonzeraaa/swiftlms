'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { Award, Download, Eye, Check, X, Calendar, Clock, Medal, Shield, AlertCircle, FileText } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import Card from '../../components/Card'
import Breadcrumbs from '../../components/ui/Breadcrumbs'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { generateCertificatePDF } from '@/app/lib/certificate-pdf'

type Certificate = Database['public']['Tables']['certificates']['Row']
type Course = Database['public']['Tables']['courses']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface CertificateWithDetails extends Certificate {
  course: Course
  user: Profile
}

interface CertificateRequest {
  id: string
  enrollment_id: string
  course_id: string
  status: 'pending' | 'approved' | 'rejected'
  request_date: string
  processed_at?: string
  notes?: string
  course?: Course
}

export default function CertificatesPage() {
  const [loading, setLoading] = useState(true)
  const [certificates, setCertificates] = useState<CertificateWithDetails[]>([])
  const [certificateRequests, setCertificateRequests] = useState<CertificateRequest[]>([])
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateWithDetails | null>(null)
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [activeTab, setActiveTab] = useState<'approved' | 'pending'>('approved')
  const certificateRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchCertificates()
  }, [])

  const fetchCertificates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      // Fetch approved certificates with course details
      const { data: certificatesData, error } = await supabase
        .from('certificates')
        .select(`
          *,
          course:courses(*),
          user:profiles!certificates_user_id_fkey(*)
        `)
        .eq('user_id', user.id)
        .eq('approval_status', 'approved')
        .order('issued_at', { ascending: false })

      if (error) {
        console.error('Error fetching certificates:', error)
      } else if (certificatesData) {
        setCertificates(certificatesData as any as CertificateWithDetails[])
      }

      // Fetch pending certificate requests
      const { data: requestsData } = await supabase
        .from('certificate_requests')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('user_id', user.id)
        .in('status', ['pending', 'rejected'])
        .order('request_date', { ascending: false })

      if (requestsData) {
        setCertificateRequests(requestsData as any as CertificateRequest[])
      }
    } catch (error) {
      console.error('Error fetching certificates:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const handleViewCertificate = (certificate: CertificateWithDetails) => {
    setSelectedCertificate(certificate)
    setShowCertificateModal(true)
  }

  const handleDownloadCertificate = async (certificate: CertificateWithDetails) => {
    try {
      setGeneratingPDF(true)
      setSelectedCertificate(certificate)
      
      // Wait for the certificate to be rendered
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Generate PDF from the hidden certificate element
      await generateCertificatePDF('certificate-pdf', `certificado-${certificate.certificate_number}.pdf`)
      
      setSelectedCertificate(null)
    } catch (error) {
      console.error('Error generating certificate PDF:', error)
      alert('Erro ao gerar o certificado. Por favor, tente novamente.')
    } finally {
      setGeneratingPDF(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs className="mb-2" />
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gold flex items-center gap-2">
            <Award className="w-8 h-8 text-gold-400" />
            Meus Certificados
          </h1>
          <p className="text-gold-300 mt-1">Certificados de conclusão dos cursos que você completou</p>
        </div>

        {/* Botão para TCC */}
        <Link href="/student-dashboard/certificates/tcc">
          <Button
            variant="primary"
            icon={<FileText className="w-5 h-5 flex-shrink-0" />}
          >
            Enviar TCC
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Certificados Aprovados</p>
              <p className="text-3xl font-bold text-gold">{certificates.length}</p>
            </div>
            <Award className="w-10 h-10 text-gold-500/30" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Aguardando Aprovação</p>
              <p className="text-3xl font-bold text-gold">
                {certificateRequests.filter((r: any) => r.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-10 h-10 text-yellow-500/30" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Horas Certificadas</p>
              <p className="text-3xl font-bold text-gold">
                {certificates.reduce((sum, cert) => sum + (cert.course_hours || 0), 0)}h
              </p>
            </div>
            <Medal className="w-10 h-10 text-blue-500/30" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Último Certificado</p>
              <p className="text-sm font-medium text-gold">
                {certificates[0] ? formatDate(certificates[0].issued_at || '') : 'Nenhum'}
              </p>
            </div>
            <Calendar className="w-10 h-10 text-green-500/30" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'approved' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('approved')}
          icon={<Award className="w-4 h-4 flex-shrink-0" />}
        >
          Certificados Aprovados ({certificates.length})
        </Button>
        <Button
          variant={activeTab === 'pending' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('pending')}
          icon={<Clock className="w-4 h-4 flex-shrink-0" />}
        >
          Aguardando Aprovação ({certificateRequests.filter((r: any) => r.status === 'pending').length})
        </Button>
      </div>

      {/* Certificates Grid or Pending Requests */}
      {activeTab === 'approved' ? (
        <Card title="Certificados Aprovados">
          {certificates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((certificate) => (
              <div
                key={certificate.id}
                className="group relative bg-gradient-to-br from-navy-900/50 to-navy-800/50 rounded-xl border-2 border-gold-500/30 hover:border-gold-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-gold-500/20"
              >
                {/* Certificate Card */}
                <div className="p-6">
                  {/* Header with Award Icon */}
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <div className="w-20 h-20 bg-gradient-to-br from-gold-500 to-gold-600 rounded-full flex items-center justify-center shadow-lg">
                        <Award className="w-10 h-10 text-navy-900" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Course Title */}
                  <h3 className="text-lg font-bold text-gold text-center mb-2">
                    {certificate.course.title}
                  </h3>

                  {/* Category */}
                  <p className="text-sm text-gold-400 text-center mb-4">
                    {certificate.course.category}
                  </p>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gold-500">Data de Emissão:</span>
                      <span className="text-gold-300">{formatDate(certificate.issued_at || '')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gold-500">Carga Horária:</span>
                      <span className="text-gold-300">{certificate.course_hours}h</span>
                    </div>
                    {certificate.grade && (
                      <div className="flex justify-between">
                        <span className="text-gold-500">Nota Final:</span>
                        <span className="text-gold-300">{certificate.grade}%</span>
                      </div>
                    )}
                  </div>

                  {/* Certificate Number */}
                  <div className="mt-4 pt-4 border-t border-gold-500/20">
                    <p className="text-xs text-gold-400 text-center">
                      Certificado Nº {certificate.certificate_number}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleViewCertificate(certificate)}
                      className="flex-1"
                      icon={<Eye className="w-4 h-4 flex-shrink-0" />}
                    >
                      Visualizar
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownloadCertificate(certificate)}
                      className="flex-1"
                      icon={<Download className="w-4 h-4 flex-shrink-0" />}
                      disabled={generatingPDF}
                    >
                      {generatingPDF ? 'Gerando...' : 'Baixar'}
                    </Button>
                  </div>
                </div>

                {/* Decorative Border Glow */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-gold-500/10 to-gold-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Medal className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
            <p className="text-gold-300 text-lg mb-2">Você ainda não possui certificados</p>
            <p className="text-gold-400 text-sm">Complete seus cursos para receber certificados de conclusão</p>
          </div>
        )}
        </Card>
      ) : (
        <Card title="Solicitações de Certificado">
          {certificateRequests.length > 0 ? (
            <div className="space-y-4">
              {certificateRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 bg-navy-900/50 rounded-xl border border-gold-500/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gold mb-1">
                        {request.course?.title || 'Curso'}
                      </h3>
                      <p className="text-sm text-gold-400 mb-3">
                        Solicitado em {formatDate(request.request_date)}
                      </p>
                      
                      {/* Status */}
                      <div className="flex items-center gap-2">
                        {request.status === 'pending' ? (
                          <>
                            <Spinner size="sm" className="text-yellow-500" />
                            <span className="text-yellow-400">Aguardando aprovação do administrador</span>
                          </>
                        ) : request.status === 'rejected' ? (
                          <>
                            <X className="w-5 h-5 text-red-500" />
                            <span className="text-red-400">Solicitação rejeitada</span>
                          </>
                        ) : null}
                      </div>
                      
                      {/* Rejection reason if exists */}
                      {request.status === 'rejected' && request.notes && (
                        <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                          <p className="text-sm text-red-400">
                            <strong>Motivo:</strong> {request.notes}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Status Badge */}
                    <div>
                      {request.status === 'pending' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                          Pendente
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                          Rejeitado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
              <p className="text-gold-300 text-lg mb-2">Nenhuma solicitação pendente</p>
              <p className="text-gold-400 text-sm">
                Complete um curso e atinja a nota mínima para solicitar o certificado
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Certificate Modal */}
      {showCertificateModal && selectedCertificate && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="max-w-3xl w-full">
            <Card variant="elevated" className="relative">
              {/* Close Button */}
              <button
                onClick={() => setShowCertificateModal(false)}
                className="absolute top-4 right-4 text-gold-400 hover:text-gold-200 transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Certificate Content */}
              <div className="text-center py-8">
                {/* Logo/Header */}
                <div className="mb-8">
                  <div className="flex justify-center mb-4">
                    <div className="w-24 h-24 bg-gradient-to-br from-gold-500 to-gold-600 rounded-full flex items-center justify-center shadow-2xl">
                      <Award className="w-12 h-12 text-navy-900" />
                    </div>
                  </div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gold to-gold-300 bg-clip-text text-transparent">
                    CERTIFICADO
                  </h1>
                  <p className="text-lg text-gold-400 mt-2">DE CONCLUSÃO</p>
                </div>

                {/* Certificate Text */}
                <div className="space-y-4 mb-8">
                  <p className="text-gold-300">Certificamos que</p>
                  <p className="text-2xl font-bold text-gold">
                    {selectedCertificate.user.full_name}
                  </p>
                  <p className="text-gold-300">concluiu com êxito o curso de</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-gold to-gold-300 bg-clip-text text-transparent">
                    {selectedCertificate.course.title}
                  </p>
                  <div className="flex justify-center gap-8 mt-6">
                    <div>
                      <p className="text-gold-400 text-sm">Carga Horária</p>
                      <p className="text-gold font-bold text-xl">{selectedCertificate.course_hours} horas</p>
                    </div>
                    {selectedCertificate.grade && (
                      <div>
                        <p className="text-gold-400 text-sm">Aproveitamento</p>
                        <p className="text-gold font-bold text-xl">{selectedCertificate.grade}%</p>
                      </div>
                    )}
                  </div>
                  <p className="text-gold-300 mt-6">
                    Emitido em {formatDate(selectedCertificate.issued_at || '')}
                  </p>
                </div>

                {/* Verification */}
                <div className="border-t border-gold-500/20 pt-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-green-500" />
                    <p className="text-sm text-green-400">Certificado Autêntico</p>
                  </div>
                  <p className="text-xs text-gold-500">
                    Nº {selectedCertificate.certificate_number}
                  </p>
                  <p className="text-xs text-gold-500">
                    Código de Verificação: {selectedCertificate.verification_code}
                  </p>
                </div>

                {/* Instructor Signature */}
                {selectedCertificate.instructor_name && (
                  <div className="mt-8">
                    <div className="border-t border-gold-500/30 w-48 mx-auto mb-2" />
                    <p className="text-sm text-gold-400">{selectedCertificate.instructor_name}</p>
                    <p className="text-xs text-gold-500">Instrutor</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-4 mt-8">
                <Button
                  variant="primary"
                  onClick={() => handleDownloadCertificate(selectedCertificate)}
                  icon={<Download className="w-4 h-4" />}
                  disabled={generatingPDF}
                >
                  {generatingPDF ? 'Gerando PDF...' : 'Baixar Certificado'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowCertificateModal(false)}
                >
                  Fechar
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Hidden Certificate for PDF Generation */}
      {selectedCertificate && (
        <div className="fixed" style={{ left: '-9999px', top: 0 }}>
          <div 
            id="certificate-pdf" 
            ref={certificateRef}
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
            {/* Certificate Content for PDF */}
            <div style={{ textAlign: 'center', paddingTop: '40px' }}>
              {/* Logo/Header */}
              <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                  <div style={{ 
                    width: '80px',
                    height: '80px',
                    backgroundColor: '#FFD700',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 30px rgba(255, 215, 0, 0.3)'
                  }}>
                    <Award style={{ width: '40px', height: '40px', color: '#001a33' }} />
                  </div>
                </div>
                <h1 style={{ 
                  fontSize: '48px',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                  color: '#FFD700',
                  letterSpacing: '3px'
                }}>
                  CERTIFICADO
                </h1>
                <p style={{ fontSize: '18px', color: '#FFD700', letterSpacing: '2px' }}>DE CONCLUSÃO</p>
              </div>

              {/* Certificate Text */}
              <div style={{ marginTop: '30px', marginBottom: '30px' }}>
                <p style={{ color: '#FFD700', opacity: 0.8, fontSize: '16px', marginBottom: '15px' }}>Certificamos que</p>
                <p style={{ color: '#FFD700', fontSize: '28px', fontWeight: 'bold', marginBottom: '20px' }}>
                  {selectedCertificate.user.full_name}
                </p>
                <p style={{ color: '#FFD700', opacity: 0.8, fontSize: '16px', marginBottom: '15px' }}>concluiu com êxito o curso de</p>
                <p style={{ 
                  fontSize: '32px',
                  fontWeight: 'bold',
                  marginBottom: '30px',
                  color: '#FFD700',
                  lineHeight: '1.2'
                }}>
                  {selectedCertificate.course.title}
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', marginTop: '30px', marginBottom: '30px' }}>
                  <div>
                    <p style={{ color: '#FFD700', opacity: 0.7, fontSize: '14px', marginBottom: '5px' }}>Carga Horária</p>
                    <p style={{ color: '#FFD700', fontSize: '20px', fontWeight: 'bold' }}>{selectedCertificate.course_hours} horas</p>
                  </div>
                  {selectedCertificate.grade && (
                    <div>
                      <p style={{ color: '#FFD700', opacity: 0.7, fontSize: '14px', marginBottom: '5px' }}>Aproveitamento</p>
                      <p style={{ color: '#FFD700', fontSize: '20px', fontWeight: 'bold' }}>{selectedCertificate.grade}%</p>
                    </div>
                  )}
                </div>
                
                <p style={{ color: '#FFD700', opacity: 0.8, fontSize: '16px', marginTop: '20px' }}>
                  Emitido em {formatDate(selectedCertificate.issued_at || '')}
                </p>
              </div>

              {/* Verification */}
              <div style={{ 
                marginTop: '40px',
                paddingTop: '30px',
                borderTop: '1px solid rgba(255, 215, 0, 0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Shield style={{ width: '18px', height: '18px', color: '#00ff00', display: 'inline-block', marginTop: '6px' }} />
                  <span style={{ color: '#00ff00', fontSize: '14px', display: 'inline-block' }}>Certificado Autêntico</span>
                </div>
                <p style={{ color: '#FFD700', opacity: 0.7, fontSize: '12px', marginBottom: '5px' }}>
                  Nº {selectedCertificate.certificate_number}
                </p>
                <p style={{ color: '#FFD700', opacity: 0.7, fontSize: '12px' }}>
                  Código de Verificação: {selectedCertificate.verification_code}
                </p>
              </div>

              {/* Instructor Signature */}
              {selectedCertificate.instructor_name && (
                <div style={{ marginTop: '40px' }}>
                  <div style={{ 
                    borderTop: '1px solid rgba(255, 215, 0, 0.5)',
                    width: '200px',
                    margin: '0 auto 10px'
                  }} />
                  <p style={{ color: '#FFD700', opacity: 0.8, fontSize: '14px', marginBottom: '5px' }}>
                    {selectedCertificate.instructor_name}
                  </p>
                  <p style={{ color: '#FFD700', opacity: 0.6, fontSize: '12px' }}>Instrutor</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

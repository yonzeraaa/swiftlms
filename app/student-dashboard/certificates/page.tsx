'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Award, Download, Eye, Check, X, Calendar, Clock, Medal, Shield } from 'lucide-react'
import Card from '../../components/Card'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { useRouter } from 'next/navigation'

type Certificate = Database['public']['Tables']['certificates']['Row']
type Course = Database['public']['Tables']['courses']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface CertificateWithDetails extends Certificate {
  course: Course
  user: Profile
}

export default function CertificatesPage() {
  const [loading, setLoading] = useState(true)
  const [certificates, setCertificates] = useState<CertificateWithDetails[]>([])
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateWithDetails | null>(null)
  const [showCertificateModal, setShowCertificateModal] = useState(false)
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

      // Fetch only approved certificates with course details
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
        return
      }

      if (certificatesData) {
        setCertificates(certificatesData as any as CertificateWithDetails[])
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

  const handleDownloadCertificate = (certificate: CertificateWithDetails) => {
    // In a real implementation, this would generate and download a PDF
    const certificateContent = `
CERTIFICADO DE CONCLUSÃO

Certificamos que ${certificate.user.full_name}
concluiu com êxito o curso de

${certificate.course.title}

com carga horária de ${certificate.course_hours} horas
em ${formatDate(certificate.issued_at || '')}

Certificado Nº: ${certificate.certificate_number}
Código de Verificação: ${certificate.verification_code}
    `
    
    const blob = new Blob([certificateContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `certificado-${certificate.certificate_number}.txt`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gold">Meus Certificados</h1>
        <p className="text-gold-300 mt-1">Certificados de conclusão dos cursos que você completou</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Total de Certificados</p>
              <p className="text-3xl font-bold text-gold">{certificates.length}</p>
            </div>
            <Award className="w-10 h-10 text-gold-500/30" />
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
            <Clock className="w-10 h-10 text-blue-500/30" />
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

      {/* Certificates Grid */}
      <Card title="Certificados Conquistados">
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
                      icon={<Eye className="w-4 h-4" />}
                    >
                      Visualizar
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownloadCertificate(certificate)}
                      className="flex-1"
                      icon={<Download className="w-4 h-4" />}
                    >
                      Baixar
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
                >
                  Baixar Certificado
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
    </div>
  )
}
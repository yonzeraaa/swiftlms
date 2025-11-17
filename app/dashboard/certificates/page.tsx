'use client'

import { useState, useEffect, useRef } from 'react'
import { Award, Download, Eye, Trash2, Plus, CheckCircle, XCircle, User, Calendar, Clock, FileText, AlertCircle, CheckCheck, X, Shield } from 'lucide-react'
import Card from '../../components/Card'
import Breadcrumbs from '../../components/ui/Breadcrumbs'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/Button'
import { Database } from '@/lib/database.types'
import { generateCertificatePDF } from '@/app/lib/certificate-pdf'
import {
  getCertificatesData,
  approveCertificateRequest,
  rejectCertificateRequest,
  generateCertificate,
  deleteCertificate,
  updateCertificateStatus
} from '@/lib/actions/admin-certificates'
import { CertificateTemplate } from '@/app/components/certificates/CertificateTemplate'

type Enrollment = Database['public']['Tables']['enrollments']['Row']
type Certificate = Database['public']['Tables']['certificates']['Row'] & {
  approval_status?: 'pending' | 'approved' | 'rejected'
  approved_at?: string | null
  approved_by?: string | null
  rejection_reason?: string | null
}
type Course = Database['public']['Tables']['courses']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface CertificateRequest {
  id: string
  enrollment_id: string
  user_id: string
  course_id: string
  total_lessons?: number | null
  completed_lessons?: number | null
  request_date: string | null
  status: string | null
  processed_at?: string | null
  processed_by?: string | null
  notes?: string | null
  certificate_type?: 'technical' | 'lato-sensu' | null
  user?: Profile
  course?: Course
  enrollment?: Enrollment
}

interface CompletedEnrollment extends Enrollment {
  course: Course
  user: Profile
  certificate?: Certificate
}

export default function CertificatesPage() {
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null)
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [completedEnrollments, setCompletedEnrollments] = useState<CompletedEnrollment[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [certificateRequests, setCertificateRequests] = useState<CertificateRequest[]>([])
  const [generatingCert, setGeneratingCert] = useState<string | null>(null)
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'approved' | 'rejected' | 'pending'>('all')
  const [activeTab, setActiveTab] = useState<'requests' | 'certificates'>('requests')
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectionModal, setShowRejectionModal] = useState<string | null>(null)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const certificateRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const result = await getCertificatesData()

      if (result.success) {
        setCertificateRequests(result.certificateRequests as any)
        setCompletedEnrollments(result.completedEnrollments as any)
        setCertificates(result.certificates as any)
      } else {
        console.error('Error fetching data:', result.error)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const approveRequest = async (requestId: string) => {
    setProcessingRequest(requestId)

    try {
      const result = await approveCertificateRequest(requestId)

      if (result.success) {
        await fetchData()
        alert(result.message || 'Certificado aprovado com sucesso!')
      } else {
        console.error('Error approving certificate:', result.error)
        alert(result.error || 'Erro ao aprovar certificado')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erro ao aprovar certificado')
    } finally {
      setProcessingRequest(null)
    }
  }

  const rejectRequest = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      alert('Por favor, forneça um motivo para a rejeição')
      return
    }

    setProcessingRequest(requestId)

    try {
      const result = await rejectCertificateRequest(requestId, rejectionReason)

      if (result.success) {
        await fetchData()
        alert('Requisição rejeitada')
        setShowRejectionModal(null)
        setRejectionReason('')
      } else {
        console.error('Error rejecting certificate:', result.error)
        alert(result.error || 'Erro ao rejeitar requisição')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erro ao rejeitar requisição')
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleGenerateCertificate = async (enrollment: CompletedEnrollment) => {
    setGeneratingCert(enrollment.id)

    try {
      const result = await generateCertificate({
        id: enrollment.id,
        user_id: enrollment.user_id,
        course_id: enrollment.course_id,
        progress_percentage: enrollment.progress_percentage,
        course: {
          instructor_id: enrollment.course.instructor_id,
          duration_hours: enrollment.course.duration_hours
        }
      })

      if (result.success) {
        await fetchData()
        alert(result.message || 'Certificado gerado com sucesso!')
      } else {
        console.error('Error generating certificate:', result.error)
        alert(result.error || 'Erro ao gerar certificado')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erro ao gerar certificado')
    } finally {
      setGeneratingCert(null)
    }
  }

  const handleDeleteCertificate = async (certificateId: string) => {
    if (!confirm('Tem certeza que deseja excluir este certificado?')) return

    try {
      const result = await deleteCertificate(certificateId)

      if (result.success) {
        await fetchData()
        alert(result.message || 'Certificado excluído com sucesso')
      } else {
        console.error('Error deleting certificate:', result.error)
        alert(result.error || 'Erro ao excluir certificado')
      }
    } catch (error) {
      console.error('Error deleting certificate:', error)
      alert('Erro ao excluir certificado')
    }
  }

  const handleViewCertificate = (certificate: any) => {
    setSelectedCertificate(certificate)
    setShowCertificateModal(true)
  }

  const handleDownloadCertificate = async (certificate: any) => {
    try {
      setGeneratingPDF(true)
      setSelectedCertificate(certificate)
      
      // Wait for the certificate to be rendered
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Generate PDF from the hidden certificate element
      await generateCertificatePDF('certificate-pdf-admin', `certificado-${certificate.certificate_number}.pdf`)
      
      setSelectedCertificate(null)
    } catch (error) {
      console.error('Error generating certificate PDF:', error)
      alert('Erro ao gerar o certificado. Por favor, tente novamente.')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const filteredCertificates = certificates.filter(cert => {
    if (filter === 'approved') return cert.approval_status === 'approved'
    if (filter === 'rejected') return cert.approval_status === 'rejected'
    if (filter === 'pending') return cert.approval_status === 'pending'
    return true
  })

  const stats = {
    total: certificates.length,
    pending: certificates.filter(c => c.approval_status === 'pending').length,
    approved: certificates.filter(c => c.approval_status === 'approved').length,
    rejected: certificates.filter(c => c.approval_status === 'rejected').length,
    requests: certificateRequests.filter(r => r.status === 'pending').length + certificates.filter(c => c.approval_status === 'pending').length
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
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold flex items-center gap-2">
          <Award className="w-8 h-8 text-gold-400" />
          Certificados
        </h1>
        <p className="text-gold-300 mt-1">Gerencie a emissão de certificados para cursos concluídos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Requisições Pendentes</p>
              <p className="text-2xl font-bold text-gold mt-1">{stats.requests}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-500/30" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Total de Certificados</p>
              <p className="text-2xl font-bold text-gold mt-1">{stats.total}</p>
            </div>
            <Award className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Aprovados</p>
              <p className="text-2xl font-bold text-gold mt-1">{stats.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Rejeitados</p>
              <p className="text-2xl font-bold text-gold mt-1">{stats.rejected}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500/30" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'requests' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('requests')}
            icon={<AlertCircle className="w-4 h-4 flex-shrink-0" />}
          >
            Requisições Pendentes ({stats.requests})
          </Button>
          <Button
            variant={activeTab === 'certificates' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('certificates')}
            icon={<Award className="w-4 h-4 flex-shrink-0" />}
          >
            Certificados
          </Button>
        </div>
      </Card>

      {/* Requisições Pendentes */}
      {activeTab === 'requests' && (
        <Card>
          <div className="overflow-x-auto table-sticky">
            <table className="w-full min-w-[1100px] table-density density-compact">
              <thead className="bg-navy-800/80 backdrop-blur-sm sticky top-0 z-10">
                <tr className="border-b border-gold-500/20">
                  <th scope="col" className="text-left text-gold-200 font-medium uppercase text-xs tracking-wider w-[280px]">Aluno</th>
                  <th scope="col" className="text-left text-gold-200 font-medium uppercase text-xs tracking-wider min-w-[250px]">Curso</th>
                  <th scope="col" className="text-center text-gold-200 font-medium uppercase text-xs tracking-wider w-[120px]">Tipo</th>
                  <th scope="col" className="text-center text-gold-200 font-medium uppercase text-xs tracking-wider w-[100px]">Nota</th>
                  <th scope="col" className="text-center text-gold-200 font-medium uppercase text-xs tracking-wider w-[130px]">Solicitado em</th>
                  <th scope="col" className="text-center text-gold-200 font-medium uppercase text-xs tracking-wider w-[100px]">Status</th>
                  <th scope="col" className="text-center text-gold-200 font-medium uppercase text-xs tracking-wider w-[200px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-500/10">
                {(() => {
                  // Combinar certificate_requests pendentes e certificates pendentes
                  const pendingRequests = certificateRequests.filter(r => r.status === 'pending')
                  const pendingCertificates = certificates.filter(c => c.approval_status === 'pending')
                  const hasAnyPending = pendingRequests.length > 0 || pendingCertificates.length > 0

                  if (!hasAnyPending) {
                    return (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <AlertCircle className="w-12 h-12 text-gold-500/30 mx-auto mb-3" />
                          <p className="text-gold-300">Nenhuma requisição pendente</p>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <>
                      {/* Mostrar requests de certificate_requests */}
                      {pendingRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-navy-800/30 transition-colors">
                      <td className="py-5 px-6 align-middle">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <User className="w-4 h-4 text-gold-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-gold-100 font-medium text-sm truncate" title={request.user?.full_name || undefined}>
                              {request.user?.full_name || 'Sem nome'}
                            </p>
                            <p className="text-gold-500 text-xs truncate" title={request.user?.email || undefined}>
                              {request.user?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-6 align-middle">
                        <div className="space-y-1">
                          <p className="text-gold-100 text-sm leading-tight line-clamp-2" title={request.course?.title || undefined}>
                            {request.course?.title}
                          </p>
                          <p className="text-gold-500 text-xs">{request.course?.duration_hours}h</p>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-center align-middle">
                        {request.certificate_type === 'lato-sensu' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gold-500/20 text-gold-300 whitespace-nowrap border border-gold-500/30">
                            ⭐ Lato Sensu
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 whitespace-nowrap border border-blue-500/30">
                            🎓 Técnico
                          </span>
                        )}
                      </td>
                      <td className="py-5 px-6 text-center align-middle">
                        <span className="text-gold-100 font-semibold text-sm">
                          {request.completed_lessons ? `${request.completed_lessons}/${request.total_lessons}` : '-'}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-center align-middle">
                        <div className="flex items-center justify-center gap-1.5 text-gold-300">
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="text-xs whitespace-nowrap">
                            {request.request_date ? new Date(request.request_date).toLocaleDateString('pt-BR') : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-center align-middle">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 whitespace-nowrap">
                          Pendente
                        </span>
                      </td>
                      <td className="py-5 px-6 align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => approveRequest(request.id)}
                            disabled={processingRequest === request.id}
                            icon={processingRequest === request.id 
                              ? <Spinner size="sm" />
                              : <CheckCheck className="w-4 h-4" />
                            }
                            title="Aprovar"
                            className="!px-3 !py-1.5"
                          >
                            Aprovar
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => setShowRejectionModal(request.id)}
                            disabled={processingRequest === request.id}
                            icon={<X className="w-4 h-4 flex-shrink-0" />}
                            title="Rejeitar"
                            className="!px-3 !py-1.5"
                          >
                            Rejeitar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}

                      {/* Mostrar certificados pendentes que não têm request */}
                      {pendingCertificates.map((cert: any) => (
                        <tr key={cert.id} className="hover:bg-navy-800/30 transition-colors">
                          <td className="py-5 px-6 align-middle">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                <User className="w-4 h-4 text-gold-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-gold-100 font-medium text-sm truncate" title={cert.user?.full_name || undefined}>
                                  {cert.user?.full_name || 'Sem nome'}
                                </p>
                                <p className="text-gold-500 text-xs truncate" title={cert.user?.email || undefined}>
                                  {cert.user?.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-5 px-6 align-middle">
                            <div className="space-y-1">
                              <p className="text-gold-100 text-sm leading-tight line-clamp-2" title={cert.course?.title || undefined}>
                                {cert.course?.title}
                              </p>
                              <p className="text-gold-500 text-xs">{cert.course_hours}h</p>
                            </div>
                          </td>
                          <td className="py-5 px-6 text-center align-middle">
                            {cert.certificate_type === 'lato-sensu' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gold-500/20 text-gold-300 whitespace-nowrap border border-gold-500/30">
                                ⭐ Lato Sensu
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 whitespace-nowrap border border-blue-500/30">
                                🎓 Técnico
                              </span>
                            )}
                          </td>
                          <td className="py-5 px-6 text-center align-middle">
                            <span className="text-gold-100 font-semibold text-sm">
                              {cert.grade || 0}%
                            </span>
                          </td>
                          <td className="py-5 px-6 text-center align-middle">
                            <div className="flex items-center justify-center gap-1.5 text-gold-300">
                              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="text-xs whitespace-nowrap">
                                {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('pt-BR') : '-'}
                              </span>
                            </div>
                          </td>
                          <td className="py-5 px-6 text-center align-middle">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 whitespace-nowrap">
                              Pendente
                            </span>
                          </td>
                          <td className="py-5 px-6 align-middle">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={async () => {
                                  if (!confirm('Aprovar este certificado?')) return
                                  try {
                                    const result = await updateCertificateStatus(cert.id, 'approved')
                                    if (result.success) {
                                      alert(result.message || 'Certificado aprovado com sucesso!')
                                      await fetchData()
                                    } else {
                                      alert(result.error || 'Erro ao aprovar certificado')
                                    }
                                  } catch (error) {
                                    console.error('Erro ao aprovar:', error)
                                    alert('Erro ao aprovar certificado')
                                  }
                                }}
                                icon={<CheckCheck className="w-4 h-4" />}
                                title="Aprovar"
                                className="!px-3 !py-1.5"
                              >
                                Aprovar
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={async () => {
                                  const reason = prompt('Motivo da rejeição:')
                                  if (!reason) return
                                  try {
                                    const result = await updateCertificateStatus(cert.id, 'rejected', reason)
                                    if (result.success) {
                                      alert(result.message || 'Certificado rejeitado')
                                      await fetchData()
                                    } else {
                                      alert(result.error || 'Erro ao rejeitar certificado')
                                    }
                                  } catch (error) {
                                    console.error('Erro ao rejeitar:', error)
                                    alert('Erro ao rejeitar certificado')
                                  }
                                }}
                                icon={<X className="w-4 h-4 flex-shrink-0" />}
                                title="Rejeitar"
                                className="!px-3 !py-1.5"
                              >
                                Rejeitar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  )
                })()}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Certificados */}
      {activeTab === 'certificates' && (
        <Card>
          {/* Filtros */}
          <div className="mb-4 flex gap-2">
            <Button
              variant={filter === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Todos ({stats.total})
            </Button>
            <Button
              variant={filter === 'approved' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('approved')}
              icon={<CheckCircle className="w-4 h-4 flex-shrink-0" />}
            >
              Aprovados ({stats.approved})
            </Button>
            <Button
              variant={filter === 'rejected' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('rejected')}
              icon={<XCircle className="w-4 h-4 flex-shrink-0" />}
            >
              Rejeitados ({stats.rejected})
            </Button>
            <Button
              variant={filter === 'pending' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('pending')}
              icon={<Clock className="w-4 h-4 flex-shrink-0" />}
            >
              Pendentes ({stats.pending})
            </Button>
          </div>
          <div className="overflow-x-auto table-sticky">
            <table className="w-full min-w-[1200px] table-density density-compact">
              <thead className="bg-navy-800/80 backdrop-blur-sm sticky top-0 z-10">
                <tr className="border-b border-gold-500/20">
                  <th scope="col" className="text-left text-gold-200 font-medium uppercase text-xs tracking-wider w-[200px]">Número</th>
                  <th scope="col" className="text-left text-gold-200 font-medium uppercase text-xs tracking-wider w-[250px]">Aluno</th>
                  <th scope="col" className="text-left text-gold-200 font-medium uppercase text-xs tracking-wider min-w-[230px]">Curso</th>
                  <th scope="col" className="text-center text-gold-200 font-medium uppercase text-xs tracking-wider w-[110px]">Tipo</th>
                  <th scope="col" className="text-center text-gold-200 font-medium uppercase text-xs tracking-wider w-[80px]">Nota</th>
                  <th scope="col" className="text-center text-gold-200 font-medium uppercase text-xs tracking-wider w-[130px]">Emitido em</th>
                  <th scope="col" className="text-center text-gold-200 font-medium uppercase text-xs tracking-wider w-[100px]">Status</th>
                  <th scope="col" className="text-center text-gold-200 font-medium uppercase text-xs tracking-wider w-[150px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-500/10">
              {filteredCertificates.length > 0 ? (
                filteredCertificates.map((certificate: any) => (
                  <tr key={certificate.id} className="hover:bg-navy-800/30 transition-colors">
                    <td className="py-5 px-6 align-middle">
                      <div className="space-y-1">
                        <p className="text-gold-100 text-xs font-mono truncate" title={certificate.certificate_number}>
                          {certificate.certificate_number}
                        </p>
                        <p className="text-gold-500 text-[10px] font-mono truncate" title={certificate.verification_code}>
                          Código: {certificate.verification_code}
                        </p>
                      </div>
                    </td>
                    <td className="py-5 px-6 align-middle">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <User className="w-4 h-4 text-gold-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-gold-100 font-medium text-sm truncate" title={certificate.user?.full_name}>
                            {certificate.user?.full_name || 'Sem nome'}
                          </p>
                          <p className="text-gold-500 text-xs truncate" title={certificate.user?.email}>
                            {certificate.user?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 align-middle">
                      <div className="space-y-1">
                        <p className="text-gold-100 text-sm leading-tight line-clamp-2" title={certificate.course?.title}>
                          {certificate.course?.title}
                        </p>
                        <p className="text-gold-500 text-xs">{certificate.course_hours}h</p>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-center align-middle">
                      {certificate.certificate_type === 'lato-sensu' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gold-500/20 text-gold-300 whitespace-nowrap border border-gold-500/30">
                          ⭐ Lato Sensu
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 whitespace-nowrap border border-blue-500/30">
                          🎓 Técnico
                        </span>
                      )}
                    </td>
                    <td className="py-5 px-6 text-center align-middle">
                      <span className="text-gold-100 font-semibold text-sm">{certificate.grade || 0}%</span>
                    </td>
                    <td className="py-5 px-6 text-center align-middle">
                      <div className="flex items-center justify-center gap-1.5 text-gold-300">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs whitespace-nowrap">
                          {certificate.issued_at 
                            ? new Date(certificate.issued_at).toLocaleDateString('pt-BR')
                            : '-'
                          }
                        </span>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-center align-middle">
                      {certificate.approval_status === 'approved' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 whitespace-nowrap">
                          Aprovado
                        </span>
                      ) : certificate.approval_status === 'rejected' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 whitespace-nowrap">
                          Rejeitado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 whitespace-nowrap">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="py-5 px-6 align-middle">
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleViewCertificate(certificate)}
                          title="Visualizar"
                          className="!p-2"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleDownloadCertificate(certificate)}
                          title="Baixar"
                          disabled={generatingPDF}
                          className="!p-2"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDeleteCertificate(certificate.id)}
                          title="Excluir"
                          className="!p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <FileText className="w-12 h-12 text-gold-500/30 mx-auto mb-3" />
                    <p className="text-gold-300">
                      {filter === 'pending' 
                        ? 'Nenhum certificado pendente'
                        : filter === 'approved'
                        ? 'Nenhum certificado aprovado'
                        : filter === 'rejected'
                        ? 'Nenhum certificado rejeitado'
                        : 'Nenhum certificado encontrado'
                      }
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      )}

      {/* Modal de Visualização de Certificado */}
      {showCertificateModal && selectedCertificate && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="max-w-3xl w-full">
            <Card variant="elevated" className="relative">
              {/* Close Button */}
              <button
                onClick={() => setShowCertificateModal(false)}
                className="absolute top-4 right-4 text-gold-400 hover:text-gold-200 transition-colors z-10"
                aria-label="Fechar visualização do certificado"
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
                    {selectedCertificate.user?.full_name || 'Nome do Aluno'}
                  </p>
                  <p className="text-gold-300">concluiu com êxito o curso de</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-gold to-gold-300 bg-clip-text text-transparent">
                    {selectedCertificate.course?.title || 'Título do Curso'}
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
                    Emitido em {selectedCertificate.issued_at ? new Date(selectedCertificate.issued_at).toLocaleDateString('pt-BR') : '-'}
                  </p>
                </div>

                {/* Status do Certificado */}
                <div className="mb-6">
                  {selectedCertificate.approval_status === 'approved' ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-green-400">Certificado Aprovado</span>
                    </div>
                  ) : selectedCertificate.approval_status === 'rejected' ? (
                    <div>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <XCircle className="w-5 h-5 text-red-500" />
                        <span className="text-red-400">Certificado Rejeitado</span>
                      </div>
                      {selectedCertificate.rejection_reason && (
                        <p className="text-sm text-gold-400">Motivo: {selectedCertificate.rejection_reason}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="w-5 h-5 text-yellow-500" />
                      <span className="text-yellow-400">Aguardando Aprovação</span>
                    </div>
                  )}
                </div>

                {/* Verification */}
                <div className="border-t border-gold-500/20 pt-6">
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

                {/* Admin Approval Info */}
                {selectedCertificate.approved_by && selectedCertificate.approved_at && (
                  <div className="mt-6 text-xs text-gold-500">
                    <p>Aprovado em {new Date(selectedCertificate.approved_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-4 mt-8">
                <Button
                  variant="primary"
                  onClick={() => handleDownloadCertificate(selectedCertificate)}
                  icon={<Download className="w-4 h-4 flex-shrink-0" />}
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

      {/* Modal de Rejeição */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <h3 className="text-lg font-semibold text-gold mb-4">Rejeitar Requisição</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gold-300 mb-2">
                  Motivo da Rejeição
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-800 border border-gold-500/30 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  rows={4}
                  placeholder="Explique o motivo da rejeição..."
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={() => rejectRequest(showRejectionModal)}
                  disabled={processingRequest === showRejectionModal}
                  icon={processingRequest === showRejectionModal 
                    ? <Spinner size="sm" />
                    : <X className="w-4 h-4" />
                  }
                >
                  Confirmar Rejeição
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowRejectionModal(null)
                    setRejectionReason('')
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Hidden Certificate for PDF Generation */}
      {selectedCertificate && (
        <div className="fixed" style={{ left: '-9999px', top: 0 }}>
          <div ref={certificateRef}>
            <CertificateTemplate
              certificate={{
                ...selectedCertificate,
                certificate_type: (selectedCertificate.certificate_type === 'lato-sensu' ? 'lato-sensu' : 'technical') as 'technical' | 'lato-sensu',
                user: {
                  full_name: selectedCertificate.user?.full_name || 'Aluno'
                },
                course: {
                  title: selectedCertificate.course?.title || 'Curso',
                  duration_hours: selectedCertificate.course?.duration_hours
                }
              }}
              elementId="certificate-pdf-admin"
              showGrade={true}
            />
          </div>
        </div>
      )}
    </div>
  )
}

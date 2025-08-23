'use client'

import { useState, useEffect, useRef } from 'react'
import { Award, Download, Eye, Trash2, Plus, CheckCircle, XCircle, Loader2, User, Calendar, Clock, FileText, AlertCircle, CheckCheck, X, Shield } from 'lucide-react'
import Card from '../../components/Card'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { generateCertificatePDF } from '@/app/lib/certificate-pdf'

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
  highest_test_score?: number | null
  total_lessons?: number | null
  completed_lessons?: number | null
  request_date: string | null
  status: string | null
  processed_at?: string | null
  processed_by?: string | null
  notes?: string | null
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
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch certificate requests with related data
      const { data: requests } = await supabase
        .from('certificate_requests' as any)
        .select('*')
        .order('request_date', { ascending: false })
      
      // Fetch related data for each request
      const requestsWithRelations = await Promise.all((requests || []).map(async (request: any) => {
        const [userRes, courseRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', request.user_id).single(),
          supabase.from('courses').select('*').eq('id', request.course_id).single()
        ])
        
        return {
          ...request,
          user: userRes.data,
          course: courseRes.data
        }
      }))

      setCertificateRequests(requestsWithRelations as any)

      // Fetch completed enrollments
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          *,
          course:courses(*),
          user:profiles(*)
        `)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      // Fetch existing certificates with user and course data
      const { data: certs } = await supabase
        .from('certificates')
        .select(`
          *,
          user:profiles!certificates_user_id_fkey(*),
          course:courses!certificates_course_id_fkey(*)
        `)
        .order('issued_at', { ascending: false })

      // Map certificates to enrollments
      const enrollmentsWithCerts = enrollments?.map(enrollment => ({
        ...enrollment,
        certificate: certs?.find(cert => 
          cert.enrollment_id === enrollment.id
        )
      })) || []

      setCompletedEnrollments(enrollmentsWithCerts as CompletedEnrollment[])
      setCertificates(certs as Certificate[] || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const approveRequest = async (requestId: string) => {
    setProcessingRequest(requestId)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.rpc('approve_certificate_request' as any, {
        p_request_id: requestId,
        p_admin_id: user.id
      })
      
      if (!error && data) {
        await fetchData()
        alert('Certificado aprovado com sucesso!')
      } else {
        console.error('Error approving certificate:', error)
        alert('Erro ao aprovar certificado')
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.rpc('reject_certificate_request' as any, {
        p_request_id: requestId,
        p_admin_id: user.id,
        p_reason: rejectionReason
      })
      
      if (!error && data) {
        await fetchData()
        alert('Requisição rejeitada')
        setShowRejectionModal(null)
        setRejectionReason('')
      } else {
        console.error('Error rejecting certificate:', error)
        alert('Erro ao rejeitar requisição')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erro ao rejeitar requisição')
    } finally {
      setProcessingRequest(null)
    }
  }

  const generateCertificate = async (enrollment: CompletedEnrollment) => {
    setGeneratingCert(enrollment.id)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      const verificationCode = Math.random().toString(36).substr(2, 16).toUpperCase()
      
      // Get instructor name
      const { data: instructor } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', enrollment.course.instructor_id!)
        .single()
      
      const { error } = await supabase
        .from('certificates')
        .insert({
          user_id: enrollment.user_id,
          course_id: enrollment.course_id,
          enrollment_id: enrollment.id,
          certificate_number: certificateNumber,
          verification_code: verificationCode,
          course_hours: enrollment.course.duration_hours || 0,
          grade: enrollment.progress_percentage || 100,
          issued_at: new Date().toISOString(),
          instructor_name: instructor?.full_name || 'SwiftEDU',
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
      
      if (!error) {
        await fetchData()
        alert('Certificado gerado com sucesso!')
      } else {
        console.error('Error generating certificate:', error)
        alert('Erro ao gerar certificado')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erro ao gerar certificado')
    } finally {
      setGeneratingCert(null)
    }
  }

  const deleteCertificate = async (certificateId: string) => {
    if (!confirm('Tem certeza que deseja excluir este certificado?')) return

    try {
      const { error } = await supabase
        .from('certificates')
        .delete()
        .eq('id', certificateId)

      if (!error) {
        await fetchData()
        alert('Certificado excluído com sucesso')
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
    requests: certificateRequests.filter(r => r.status === 'pending').length
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
        <h1 className="text-3xl font-bold text-gold">Certificados</h1>
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
            icon={<AlertCircle className="w-4 h-4" />}
          >
            Requisições Pendentes ({stats.requests})
          </Button>
          <Button
            variant={activeTab === 'certificates' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('certificates')}
            icon={<Award className="w-4 h-4" />}
          >
            Certificados
          </Button>
        </div>
      </Card>

      {/* Requisições Pendentes */}
      {activeTab === 'requests' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold-500/20">
                  <th className="text-left py-4 px-4 text-gold-200 font-medium">Aluno</th>
                  <th className="text-left py-4 px-4 text-gold-200 font-medium">Curso</th>
                  <th className="text-center py-4 px-4 text-gold-200 font-medium">Nota</th>
                  <th className="text-center py-4 px-4 text-gold-200 font-medium">Lições</th>
                  <th className="text-center py-4 px-4 text-gold-200 font-medium">Solicitado em</th>
                  <th className="text-center py-4 px-4 text-gold-200 font-medium">Status</th>
                  <th className="text-center py-4 px-4 text-gold-200 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {certificateRequests.filter(r => r.status === 'pending').length > 0 ? (
                  certificateRequests.filter(r => r.status === 'pending').map((request) => (
                    <tr key={request.id} className="border-b border-gold-500/10 hover:bg-navy-800/30">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gold-400" />
                          <div>
                            <p className="text-gold-100 font-medium">{request.user?.full_name || 'Sem nome'}</p>
                            <p className="text-gold-400 text-sm">{request.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-gold-200">{request.course?.title}</p>
                        <p className="text-gold-400 text-sm">{request.course?.duration_hours}h</p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gold-200">{request.highest_test_score || 0}%</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gold-200">
                          {request.completed_lessons}/{request.total_lessons}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-gold-300 text-sm">
                          <Calendar className="w-3 h-3" />
                          {request.request_date ? new Date(request.request_date).toLocaleDateString('pt-BR') : '-'}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400">
                          Pendente
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => approveRequest(request.id)}
                            disabled={processingRequest === request.id}
                            icon={processingRequest === request.id 
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <CheckCheck className="w-4 h-4" />
                            }
                            title="Aprovar"
                          >
                            Aprovar
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => setShowRejectionModal(request.id)}
                            disabled={processingRequest === request.id}
                            icon={<X className="w-4 h-4" />}
                            title="Rejeitar"
                          >
                            Rejeitar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <AlertCircle className="w-12 h-12 text-gold-500/30 mx-auto mb-3" />
                      <p className="text-gold-300">Nenhuma requisição pendente</p>
                    </td>
                  </tr>
                )}
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
              icon={<CheckCircle className="w-4 h-4" />}
            >
              Aprovados ({stats.approved})
            </Button>
            <Button
              variant={filter === 'rejected' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('rejected')}
              icon={<XCircle className="w-4 h-4" />}
            >
              Rejeitados ({stats.rejected})
            </Button>
            <Button
              variant={filter === 'pending' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('pending')}
              icon={<Clock className="w-4 h-4" />}
            >
              Pendentes ({stats.pending})
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold-500/20">
                  <th className="text-left py-4 px-4 text-gold-200 font-medium">Número</th>
                  <th className="text-left py-4 px-4 text-gold-200 font-medium">Aluno</th>
                  <th className="text-left py-4 px-4 text-gold-200 font-medium">Curso</th>
                  <th className="text-center py-4 px-4 text-gold-200 font-medium">Nota</th>
                  <th className="text-center py-4 px-4 text-gold-200 font-medium">Emitido em</th>
                  <th className="text-center py-4 px-4 text-gold-200 font-medium">Status</th>
                  <th className="text-center py-4 px-4 text-gold-200 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
              {filteredCertificates.length > 0 ? (
                filteredCertificates.map((certificate: any) => (
                  <tr key={certificate.id} className="border-b border-gold-500/10 hover:bg-navy-800/30">
                    <td className="py-4 px-4">
                      <p className="text-gold-200 text-sm font-mono">{certificate.certificate_number}</p>
                      <p className="text-gold-400 text-xs">Código: {certificate.verification_code}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gold-400" />
                        <div>
                          <p className="text-gold-100 font-medium">{certificate.user?.full_name || 'Sem nome'}</p>
                          <p className="text-gold-400 text-sm">{certificate.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-gold-200">{certificate.course?.title}</p>
                      <p className="text-gold-400 text-sm">{certificate.course_hours}h</p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-gold-200">{certificate.grade || 0}%</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-gold-300 text-sm">
                        <Calendar className="w-3 h-3" />
                        {certificate.issued_at 
                          ? new Date(certificate.issued_at).toLocaleDateString('pt-BR')
                          : '-'
                        }
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {certificate.approval_status === 'approved' ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                          Aprovado
                        </span>
                      ) : certificate.approval_status === 'rejected' ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                          Rejeitado
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleViewCertificate(certificate)}
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleDownloadCertificate(certificate)}
                          title="Baixar"
                          disabled={generatingPDF}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => deleteCertificate(certificate.id)}
                          title="Excluir"
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
                    ? <Loader2 className="w-4 h-4 animate-spin" />
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
        <div className="fixed left-[-9999px] top-0">
          <div 
            id="certificate-pdf-admin" 
            ref={certificateRef}
            className="w-[800px] h-[600px] bg-gradient-to-br from-navy-900 to-navy-800 p-12 flex flex-col justify-center"
            style={{
              background: 'linear-gradient(135deg, #001a33 0%, #002244 100%)'
            }}
          >
            {/* Certificate Content for PDF */}
            <div className="text-center">
              {/* Logo/Header */}
              <div className="mb-8">
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-gold-500 to-gold-600 rounded-full flex items-center justify-center shadow-2xl"
                       style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' }}>
                    <Award className="w-12 h-12 text-navy-900" style={{ color: '#001a33' }} />
                  </div>
                </div>
                <h1 className="text-5xl font-bold mb-2" style={{ 
                  background: 'linear-gradient(90deg, #FFD700 0%, #FFA500 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  CERTIFICADO
                </h1>
                <p className="text-xl" style={{ color: '#FFD700' }}>DE CONCLUSÃO</p>
              </div>

              {/* Certificate Text */}
              <div className="space-y-3">
                <p style={{ color: '#FFD700', opacity: 0.8 }}>Certificamos que</p>
                <p className="text-3xl font-bold" style={{ color: '#FFD700' }}>
                  {selectedCertificate.user?.full_name || 'Aluno'}
                </p>
                <p style={{ color: '#FFD700', opacity: 0.8 }}>concluiu com êxito o curso de</p>
                <p className="text-4xl font-bold mb-4" style={{ 
                  background: 'linear-gradient(90deg, #FFD700 0%, #FFA500 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {selectedCertificate.course?.title || 'Curso'}
                </p>
                
                <div className="flex justify-center gap-12 mt-6 mb-4">
                  <div>
                    <p className="text-sm" style={{ color: '#FFD700', opacity: 0.7 }}>Carga Horária</p>
                    <p className="text-2xl font-bold" style={{ color: '#FFD700' }}>{selectedCertificate.course_hours} horas</p>
                  </div>
                  {selectedCertificate.grade && (
                    <div>
                      <p className="text-sm" style={{ color: '#FFD700', opacity: 0.7 }}>Aproveitamento</p>
                      <p className="text-2xl font-bold" style={{ color: '#FFD700' }}>{selectedCertificate.grade}%</p>
                    </div>
                  )}
                </div>
                
                <p style={{ color: '#FFD700', opacity: 0.8 }}>
                  Emitido em {selectedCertificate.issued_at ? formatDate(selectedCertificate.issued_at) : ''}
                </p>
              </div>

              {/* Verification */}
              <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255, 215, 0, 0.3)' }}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="w-5 h-5" style={{ color: '#00ff00' }} />
                  <p className="text-sm" style={{ color: '#00ff00' }}>Certificado Autêntico</p>
                </div>
                <p className="text-xs" style={{ color: '#FFD700', opacity: 0.7 }}>
                  Nº {selectedCertificate.certificate_number}
                </p>
                <p className="text-xs" style={{ color: '#FFD700', opacity: 0.7 }}>
                  Código de Verificação: {selectedCertificate.verification_code}
                </p>
              </div>

              {/* Instructor Signature */}
              {selectedCertificate.instructor_name && (
                <div className="mt-8">
                  <div style={{ borderTop: '1px solid rgba(255, 215, 0, 0.5)', width: '200px', margin: '0 auto 8px' }} />
                  <p className="text-sm" style={{ color: '#FFD700', opacity: 0.8 }}>{selectedCertificate.instructor_name}</p>
                  <p className="text-xs" style={{ color: '#FFD700', opacity: 0.6 }}>Instrutor</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
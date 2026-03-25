'use client'

import { useState, useEffect, useRef } from 'react'
import { Award, Download, Eye, Trash2, CheckCircle, XCircle, User, Calendar, FileText, AlertCircle, X, Upload as UploadIcon, File as FileIcon } from 'lucide-react'
import { ClassicRule, CornerBracket } from '../../components/ui/RenaissanceSvgs'
import Spinner from '../../components/ui/Spinner'
import { Database } from '@/lib/database.types'
import { generateCertificatePDF } from '@/app/lib/certificate-pdf'
import {
  getCertificatesData,
  approveCertificateRequest,
  rejectCertificateRequest,
  deleteCertificate,
  updateCertificateStatus
} from '@/lib/actions/admin-certificates'
import { CertificateTemplate } from '@/app/components/certificates/CertificateTemplate'
import CertificateUploadModal from './components/CertificateUploadModal'
import { downloadCertificateFile } from '@/lib/actions/certificate-upload'
import toast from 'react-hot-toast'

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

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

export default function CertificatesPage() {
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null)
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [completedEnrollments, setCompletedEnrollments] = useState<CompletedEnrollment[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [certificateRequests, setCertificateRequests] = useState<CertificateRequest[]>([])
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'approved' | 'rejected' | 'pending'>('all')
  const [activeTab, setActiveTab] = useState<'requests' | 'certificates'>('requests')
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectionModal, setShowRejectionModal] = useState<string | null>(null)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState<{
    certificateId: string
    certificateNumber: string
    studentName: string
  } | null>(null)
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
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const approveRequest = async (requestId: string) => {
    if (!confirm('Aprovar esta petição de emissão?')) return
    setProcessingRequest(requestId)
    try {
      const result = await approveCertificateRequest(requestId)
      if (result.success) {
        await fetchData()
        toast.success('Certificado aprovado!')
      } else {
        toast.error(result.error || 'Erro ao aprovar')
      }
    } catch (error) {
      console.error(error)
    } finally {
      setProcessingRequest(null)
    }
  }

  const rejectRequest = async (requestId: string) => {
    if (!rejectionReason.trim()) { toast.error('Informe o motivo'); return }
    setProcessingRequest(requestId)
    try {
      const result = await rejectCertificateRequest(requestId, rejectionReason)
      if (result.success) {
        await fetchData()
        setShowRejectionModal(null)
        setRejectionReason('')
        toast.success('Petição impugnada')
      }
    } catch (error) {
      console.error(error)
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleDeleteCertificate = async (certificateId: string) => {
    if (!confirm('Expurgar este registro permanentemente?')) return
    try {
      const result = await deleteCertificate(certificateId)
      if (result.success) {
        await fetchData()
        toast.success('Registro removido')
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleViewCertificate = (certificate: any) => {
    setSelectedCertificate(certificate)
    setShowCertificateModal(true)
  }

  const handleDownloadCertificate = async (certificate: any) => {
    if (certificate.file_path) {
      try {
        const { blob, name } = await downloadCertificateFile(certificate.id)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url)
      } catch (error) {
        toast.error('Erro no download')
      }
      return
    }

    try {
      setGeneratingPDF(true)
      setSelectedCertificate(certificate)
      await new Promise(r => setTimeout(r, 150))
      await generateCertificatePDF('certificate-pdf-admin', `certificado-${certificate.certificate_number}.pdf`)
      setSelectedCertificate(null)
      toast.success('PDF Gerado')
    } catch (error) {
      console.error(error)
    } finally {
      setGeneratingPDF(false)
    }
  }

  const handleUploadCertificate = (certificate: any) => {
    setShowUploadModal({
      certificateId: certificate.id,
      certificateNumber: certificate.certificate_number,
      studentName: certificate.user?.full_name || 'Aluno',
    })
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: 'numeric', month: 'long', year: 'numeric'
    })
  }

  const filteredCertificates = certificates.filter(cert => {
    if (filter === 'approved') return cert.approval_status === 'approved'
    if (filter === 'rejected') return cert.approval_status === 'rejected'
    if (filter === 'pending') return cert.approval_status === 'pending'
    return true
  })

  const statsCount = {
    total: certificates.length,
    approved: certificates.filter(c => c.approval_status === 'approved').length,
    rejected: certificates.filter(c => c.approval_status === 'rejected').length,
    requests: certificateRequests.filter(r => r.status === 'pending').length + certificates.filter(c => c.approval_status === 'pending').length
  }

  if (loading) return <Spinner fullPage size="xl" />

  return (
    <div className="flex flex-col w-full">
      {/* ── Cabeçalho Principal ── */}
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 w-full border-b border-[#1e130c]/10 pb-8">
        <div className="flex-1">
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 700, color: INK, lineHeight: 1 }}>
            Livro de Certificados
          </h1>
          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontStyle: 'italic', color: MUTED, marginTop: '0.5rem' }}>
            Registro e autenticação de títulos acadêmicos emitidos
          </p>
          <div className="mt-6 w-full max-w-md">
            <ClassicRule color={INK} />
          </div>
        </div>
      </div>

      {/* ── Métricas de Registro ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
        {[
          { label: 'Petições Pendentes', value: statsCount.requests },
          { label: 'Total de Registros', value: statsCount.total },
          { label: 'Títulos Aprovados', value: statsCount.approved },
          { label: 'Títulos Impugnados', value: statsCount.rejected }
        ].map((s, idx) => (
          <div key={idx} className="border border-[#1e130c]/10 bg-[#1e130c]/[0.02] flex items-center px-6 py-4 justify-between">
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</span>
            <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '2rem', fontWeight: 700, color: INK, lineHeight: 1 }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* ── Navegação de Abas ── */}
      <div className="flex gap-8 mb-8 border-b border-[#1e130c]/10">
        {[
          { id: 'requests', label: `Petições de Emissão (${statsCount.requests})` },
          { id: 'certificates', label: 'Livro de Registros' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: 'none', border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${INK}` : '2px solid transparent',
              padding: '0.75rem 0', color: activeTab === tab.id ? INK : MUTED,
              fontFamily: 'var(--font-lora)', fontWeight: activeTab === tab.id ? 700 : 400,
              fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Conteúdo das Abas ── */}
      <div className="w-full overflow-x-auto custom-scrollbar">
        {activeTab === 'requests' ? (
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr style={{ borderBottom: `2px solid ${INK}` }}>
                <th className="px-4 py-4 text-left" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Aluno</th>
                <th className="px-4 py-4 text-left" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Compêndio / Curso</th>
                <th className="px-4 py-4 text-left w-32" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Tipo</th>
                <th className="px-4 py-4 text-left w-32" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Solicitado</th>
                <th className="px-4 py-4 text-right w-48" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const pReqs = certificateRequests.filter(r => r.status === 'pending')
                const pCerts = certificates.filter(c => c.approval_status === 'pending')
                if (pReqs.length === 0 && pCerts.length === 0) {
                  return (<tr><td colSpan={5} className="py-20 text-center italic text-[#7a6350]">Nenhuma petição aguardando despacho.</td></tr>)
                }
                return (
                  <>
                    {pReqs.map(r => (
                      <tr key={r.id} style={{ borderBottom: `1px dashed ${BORDER}` }} className="hover:bg-[#1e130c]/[0.02] transition-colors group">
                        <td className="px-4 py-6 align-top">
                          <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', fontWeight: 600, color: INK }}>{r.user?.full_name}</span>
                          <p className="text-xs italic text-[#7a6350]">{r.user?.email}</p>
                        </td>
                        <td className="px-4 py-6 align-top">
                          <span style={{ fontFamily: 'var(--font-lora)', fontSize: '1rem', color: INK }}>{r.course?.title}</span>
                          <p className="text-xs uppercase tracking-wider text-[#8b6d22] font-bold">{r.course?.duration_hours}h</p>
                        </td>
                        <td className="px-4 py-6 align-top italic text-sm text-[#7a6350]">{r.certificate_type === 'lato-sensu' ? '⭐ Lato Sensu' : '🎓 Técnico'}</td>
                        <td className="px-4 py-6 align-top text-sm">{r.request_date ? new Date(r.request_date).toLocaleDateString('pt-BR') : '-'}</td>
                        <td className="px-4 py-6 text-right align-top">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => approveRequest(r.id)} style={{ padding: '0.5rem 1rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Deferir</button>
                            <button onClick={() => setShowRejectionModal(r.id)} style={{ padding: '0.5rem 1rem', background: 'none', border: `1px solid ${INK}`, color: INK, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Impugnar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pCerts.map((c: any) => (
                      <tr key={c.id} style={{ borderBottom: `1px dashed ${BORDER}` }} className="hover:bg-[#1e130c]/[0.02] transition-colors group">
                        <td className="px-4 py-6 align-top">
                          <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', fontWeight: 600, color: INK }}>{c.user?.full_name}</span>
                          <p className="text-xs italic text-[#7a6350]">{c.user?.email}</p>
                        </td>
                        <td className="px-4 py-6 align-top">
                          <span style={{ fontFamily: 'var(--font-lora)', fontSize: '1rem', color: INK }}>{c.course?.title}</span>
                          <p className="text-xs uppercase tracking-wider text-[#8b6d22] font-bold">{c.course_hours}h</p>
                        </td>
                        <td className="px-4 py-6 align-top italic text-sm text-[#7a6350]">{c.certificate_type === 'lato-sensu' ? '⭐ Lato Sensu' : '🎓 Técnico'}</td>
                        <td className="px-4 py-6 align-top text-sm">{c.issued_at ? new Date(c.issued_at).toLocaleDateString('pt-BR') : '-'}</td>
                        <td className="px-4 py-6 text-right align-top">
                          <div className="flex justify-end gap-2">
                            <button onClick={async () => {
                              if (confirm('Deferir este título?')) {
                                const res = await updateCertificateStatus(c.id, 'approved'); if (res.success) fetchData();
                              }
                            }} style={{ padding: '0.5rem 1rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Deferir</button>
                            <button onClick={() => {
                              const r = prompt('Motivo:'); if (r) updateCertificateStatus(c.id, 'rejected', r).then(() => fetchData());
                            }} style={{ padding: '0.5rem 1rem', background: 'none', border: `1px solid ${INK}`, color: INK, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Impugnar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                )
              })()}
            </tbody>
          </table>
        ) : (
          <div>
            <div className="flex justify-end gap-2 mb-6">
              {['all', 'approved', 'rejected', 'pending'].map(f => (
                <button
                  key={f} onClick={() => setFilter(f as any)}
                  style={{
                    padding: '0.5rem 1rem', background: filter === f ? INK : 'none',
                    color: filter === f ? PARCH : INK, border: `1px solid ${INK}`,
                    fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer'
                  }}
                >
                  {f === 'all' ? 'Todos' : f === 'approved' ? 'Aprovados' : f === 'rejected' ? 'Rejeitados' : 'Pendentes'}
                </button>
              ))}
            </div>
            <table className="w-full border-collapse min-w-[1000px]">
              <thead>
                <tr style={{ borderBottom: `2px solid ${INK}` }}>
                  <th className="px-4 py-4 text-left w-48" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Número / Cód.</th>
                  <th className="px-4 py-4 text-left" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Portador</th>
                  <th className="px-4 py-4 text-left" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Título Acadêmico</th>
                  <th className="px-4 py-4 text-left w-32" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Data Emissão</th>
                  <th className="px-4 py-4 text-right w-48" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredCertificates.length > 0 ? filteredCertificates.map((c: any) => (
                  <tr key={c.id} style={{ borderBottom: `1px dashed ${BORDER}` }} className="hover:bg-[#1e130c]/[0.02] transition-colors group">
                    <td className="px-4 py-6 align-top">
                      <p className="font-mono text-xs font-bold text-black">{c.certificate_number}</p>
                      <p className="font-mono text-[10px] text-[#8b6d22] uppercase mt-1">Verif: {c.verification_code}</p>
                    </td>
                    <td className="px-4 py-6 align-top">
                      <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', fontWeight: 600, color: INK }}>{c.user?.full_name}</span>
                      <p className="text-xs italic text-[#7a6350]">{c.user?.email}</p>
                    </td>
                    <td className="px-4 py-6 align-top">
                      <span style={{ fontFamily: 'var(--font-lora)', fontSize: '1rem', color: INK }}>{c.course?.title}</span>
                      <div className="flex gap-2 mt-1">
                        <span style={{ 
                          fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', 
                          padding: '0.1rem 0.4rem', border: `1px solid ${c.approval_status === 'approved' ? INK : MUTED}`, 
                          color: c.approval_status === 'approved' ? INK : MUTED 
                        }}>{c.approval_status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-6 align-top text-sm">{c.issued_at ? new Date(c.issued_at).toLocaleDateString('pt-BR') : '-'}</td>
                    <td className="px-4 py-6 text-right align-top">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleViewCertificate(c)} className="p-2 hover:bg-[#1e130c]/5 text-[#8b6d22]" title="Visualizar"><Eye size={16} /></button>
                        <button onClick={() => handleUploadCertificate(c)} className="p-2 hover:bg-[#1e130c]/5 text-[#8b6d22]" title="Anexar Arquivo">{c.file_path ? <FileIcon size={16} className="opacity-60" /> : <UploadIcon size={16} />}</button>
                        <button onClick={() => handleDownloadCertificate(c)} disabled={generatingPDF} className="p-2 hover:bg-[#1e130c]/5 text-[#8b6d22]" title="Baixar PDF"><Download size={16} /></button>
                        <button onClick={() => handleDeleteCertificate(c.id)} className="p-2 hover:bg-[#1e130c]/5 text-black opacity-40" title="Eliminar"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )) : (<tr><td colSpan={5} className="py-20 text-center italic text-[#7a6350]">Nenhum registro encontrado no acervo.</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modais Redesenhados ── */}
      {showCertificateModal && selectedCertificate && (
        <div className="fixed inset-0 bg-[#1e130c]/70 backdrop-blur-md flex items-center justify-center z-[10000] p-4">
          <div className="bg-[#faf6ee] w-full max-w-3xl relative border-2 border-[#1e130c] shadow-2xl p-12 text-center font-[family-name:var(--font-lora)] overflow-y-auto custom-scrollbar max-h-[95vh]">
            <CornerBracket className="absolute top-6 left-6 w-12 h-12 text-[#1e130c]/10" />
            <CornerBracket className="absolute top-6 right-6 w-12 h-12 text-[#1e130c]/10 rotate-90" />
            
            <button onClick={() => setShowCertificateModal(false)} className="absolute top-6 right-6 text-[#1e130c]/40 hover:text-[#1e130c] transition-colors"><X size={32} /></button>
            
            <Award size={64} style={{ color: ACCENT, margin: '0 auto 2.5rem' }} />
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '3rem', color: INK, marginBottom: '2.5rem' }}>Diploma de Excelência</h2>
            
            <p className="italic text-[#7a6350] mb-4 text-xl">Certificamos solenemente que</p>
            <p style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.5rem', color: INK, fontWeight: 700, marginBottom: '2.5rem' }}>{selectedCertificate.user?.full_name}</p>
            
            <p className="italic text-[#7a6350] mb-4 text-xl">concluiu com êxito os requisitos do compêndio</p>
            <h4 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.75rem', color: ACCENT, fontWeight: 600, marginBottom: '3.5rem' }}>{selectedCertificate.course?.title}</h4>
            
            <div className="border-t border-[#1e130c]/10 pt-8 mt-8 grid grid-cols-2 gap-8 text-sm uppercase tracking-widest text-[#7a6350]">
              <div>
                <p>Registro Geral</p>
                <p className="text-black font-bold mt-1">{selectedCertificate.certificate_number}</p>
              </div>
              <div>
                <p>Data de Autenticação</p>
                <p className="text-black font-bold mt-1">{selectedCertificate.issued_at ? formatDate(selectedCertificate.issued_at) : '-'}</p>
              </div>
            </div>

            <div className="mt-12 flex justify-center gap-6">
              <button onClick={() => handleDownloadCertificate(selectedCertificate)} style={{ padding: '1rem 3rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gerar Documento Digital</button>
              <button onClick={() => setShowCertificateModal(false)} style={{ padding: '1rem 2rem', background: 'none', border: `1px solid ${INK}`, color: INK, cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showRejectionModal && (
        <div className="fixed inset-0 bg-[#1e130c]/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-[#faf6ee] w-full max-w-md relative border border-[#7a6350] p-12 text-center font-[family-name:var(--font-lora)] shadow-2xl">
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2rem', color: '#7a6350', marginBottom: '2rem', fontWeight: 700 }}>Impugnar Petição</h2>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Justifique o motivo da recusa oficial..."
              style={{ width: '100%', padding: '1rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, minHeight: '120px', marginBottom: '2.5rem', fontFamily: 'var(--font-lora)', fontStyle: 'italic' }}
            />
            <div className="flex gap-4">
              <button onClick={() => setShowRejectionModal(null)} style={{ flex: 1, padding: '1rem', background: 'none', border: `1px solid ${INK}`, color: INK, cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase' }}>Cancelar</button>
              <button onClick={() => rejectRequest(showRejectionModal)} style={{ flex: 1, padding: '1rem', backgroundColor: '#7a6350', color: PARCH, border: 'none', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase' }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Componentes Ocultos / Utilitários */}
      {selectedCertificate && (
        <div className="fixed" style={{ left: '-9999px', top: 0 }}>
          <div ref={certificateRef}>
            <CertificateTemplate
              certificate={{
                ...selectedCertificate,
                certificate_type: (selectedCertificate.certificate_type === 'lato-sensu' ? 'lato-sensu' : 'technical') as 'technical' | 'lato-sensu',
                user: { full_name: selectedCertificate.user?.full_name || 'Aluno' },
                course: { title: selectedCertificate.course?.title || 'Curso', duration_hours: selectedCertificate.course?.duration_hours }
              }}
              elementId="certificate-pdf-admin"
              showGrade={true}
            />
          </div>
        </div>
      )}

      {showUploadModal && (
        <CertificateUploadModal
          certificateId={showUploadModal.certificateId}
          certificateNumber={showUploadModal.certificateNumber}
          studentName={showUploadModal.studentName}
          onClose={() => setShowUploadModal(null)}
          onSuccess={async () => { await fetchData(); setShowUploadModal(null); }}
        />
      )}
    </div>
  )
}

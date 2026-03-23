'use client'

import { useState, useEffect, useRef } from 'react'
import { Award, Download, Eye, Clock, Shield, FileText, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { generateCertificatePDF } from '@/app/lib/certificate-pdf'
import { getUserCertificatesData } from '@/lib/actions/certificates'
import { CertificateTemplate } from '@/app/components/certificates/CertificateTemplate'
import { ClassicRule, CornerBracket } from '../../components/ui/RenaissanceSvgs'
import Spinner from '../../components/ui/Spinner'
import { Database } from '@/lib/database.types'

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
  certificate_type: string | null
}

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

function SkeletonBlock({ height = 20, width = '100%', style }: { height?: number; width?: string | number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        height,
        width,
        backgroundColor: 'rgba(30,19,12,0.06)',
        borderRadius: 0,
        animation: 'pulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  )
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

  useEffect(() => {
    fetchCertificates()
  }, [])

  const fetchCertificates = async () => {
    try {
      const data = await getUserCertificatesData()
      setCertificates(data.certificates)
      setCertificateRequests(data.requests)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const handleDownloadCertificate = async (certificate: CertificateWithDetails) => {
    try {
      setGeneratingPDF(true)
      setSelectedCertificate(certificate)
      await new Promise(resolve => setTimeout(resolve, 150))
      await generateCertificatePDF('certificate-pdf', `certificado-${certificate.certificate_number}.pdf`)
      setSelectedCertificate(null)
    } catch (err) {
      console.error(err)
      alert('Erro ao processar documento.')
    } finally {
      setGeneratingPDF(false)
    }
  }

  if (loading) {
    return <Spinner fullPage size="xl" />
  }

  return (
    <div className="flex flex-col">
      <div className="text-center flex flex-col items-center mb-12">
        <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.5rem', fontWeight: 700, color: INK, marginBottom: '0.5rem' }}>
          Meus Certificados
        </h1>
        <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontStyle: 'italic', color: MUTED }}>
          Seu acervo oficial de conquistas e honrarias acadêmicas
        </p>
        <ClassicRule style={{ width: '100%', maxWidth: '300px', marginTop: '2.5rem', color: INK }} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
        {[
          { label: 'Aprovados', value: certificates.length },
          { label: 'Pendentes', value: certificateRequests.filter(r => r.status === 'pending').length },
          { label: 'Horas Totais', value: `${certificates.reduce((s, c) => s + (c.course?.duration_hours || 0), 0)}h` },
          { label: 'Último Recebido', value: certificates[0] ? formatDate(certificates[0].issued_at || '') : 'Nenhum', isSmall: true }
        ].map((s, idx) => (
          <div key={idx} className="text-center">
            <span style={{ display: 'block', fontSize: '0.7rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>{s.label}</span>
            <span style={{ fontFamily: 'var(--font-playfair)', fontSize: s.isSmall ? '1rem' : '2.5rem', color: INK, fontWeight: 700 }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
        <div className="flex gap-4">
          {['approved', 'pending'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? `2px solid ${INK}` : '2px solid transparent',
                padding: '0.5rem 1rem',
                color: activeTab === tab ? INK : MUTED,
                fontFamily: 'var(--font-lora)',
                fontWeight: activeTab === tab ? 700 : 400,
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer'
              }}
            >
              {tab === 'approved' ? 'Aprovados' : 'Pendentes'}
            </button>
          ))}
        </div>
        <Link href="/student-dashboard/certificates/tcc">
          <button style={{ padding: '0.75rem 2rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} /> Enviar TCC
          </button>
        </Link>
      </div>

      {activeTab === 'approved' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {certificates.length > 0 ? certificates.map(cert => (
            <div key={cert.id} style={{ backgroundColor: PARCH, border: `1px solid ${BORDER}`, padding: '2rem', position: 'relative' }}>
              <div className="absolute top-2 left-2 w-6 h-6"><CornerBracket size={24} /></div>
              <Award size={32} style={{ color: ACCENT, marginBottom: '1.5rem' }} />
              <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.2rem', fontWeight: 600, color: INK, marginBottom: '0.5rem' }}>{cert.course.title}</h3>
              <p style={{ fontSize: '0.8rem', color: MUTED, fontStyle: 'italic', marginBottom: '1.5rem' }}>Emitido em {formatDate(cert.issued_at || '')}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setSelectedCertificate(cert); setShowCertificateModal(true); }}
                  style={{ flex: 1, padding: '0.6rem', border: `1px solid ${INK}`, color: INK, background: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}
                >
                  Visualizar
                </button>
                <button
                  onClick={() => handleDownloadCertificate(cert)}
                  disabled={generatingPDF}
                  style={{ flex: 1, padding: '0.6rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}
                >
                  {generatingPDF ? '...' : 'Baixar'}
                </button>
              </div>
            </div>
          )) : <div className="col-span-full py-20 text-center italic text-[#7a6350]">Nenhum certificado registrado sob seu nome.</div>}
        </div>
      ) : (
        <div className="space-y-6">
          {certificateRequests.length > 0 ? certificateRequests.map(req => (
            <div key={req.id} style={{ border: `1px dashed ${BORDER}`, padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontFamily: 'var(--font-lora)', fontWeight: 600, color: INK }}>{req.course?.title}</h4>
                <p style={{ fontSize: '0.8rem', color: MUTED }}>Solicitado em {formatDate(req.request_date)}</p>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: req.status === 'pending' ? ACCENT : '#7a6350', textTransform: 'uppercase' }}>
                {req.status === 'pending' ? 'Em Análise' : 'Reprovado'}
              </span>
            </div>
          )) : <div className="py-20 text-center italic text-[#7a6350]">Nenhuma solicitação pendente no momento.</div>}
        </div>
      )}

      {/* Modal Visualização */}
      {showCertificateModal && selectedCertificate && (
        <div className="fixed inset-0 bg-[#1e130c]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#faf6ee] w-full max-w-2xl relative border-2 border-[#1e130c] shadow-2xl p-12 text-center font-[family-name:var(--font-lora)]">
            <button onClick={() => setShowCertificateModal(false)} className="absolute top-4 right-4 text-[#1e130c]/40 hover:text-[#1e130c]">✕</button>
            <Award size={64} style={{ color: ACCENT, margin: '0 auto 2rem' }} />
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.5rem', color: INK, marginBottom: '2rem' }}>Diploma de Excelência</h2>
            <p style={{ color: MUTED, fontStyle: 'italic', marginBottom: '2rem' }}>Certificamos que</p>
            <p style={{ fontFamily: 'var(--font-playfair)', fontSize: '2rem', color: INK, fontWeight: 700, marginBottom: '2rem' }}>{selectedCertificate.user.full_name}</p>
            <p style={{ color: MUTED, fontStyle: 'italic', marginBottom: '1rem' }}>concluiu com êxito os requisitos do curso</p>
            <h4 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.5rem', color: ACCENT, fontWeight: 600, marginBottom: '3rem' }}>{selectedCertificate.course.title}</h4>
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '2rem' }}>
              <p style={{ fontSize: '0.75rem', color: MUTED, textTransform: 'uppercase' }}>Registro Nº {selectedCertificate.certificate_number}</p>
              <p style={{ fontSize: '0.75rem', color: MUTED, textTransform: 'uppercase' }}>Autenticado em {formatDate(selectedCertificate.issued_at || '')}</p>
            </div>
            <div className="mt-8 flex justify-center gap-4">
              <button onClick={() => handleDownloadCertificate(selectedCertificate)} style={{ padding: '0.75rem 2rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase' }}>Baixar PDF</button>
            </div>
          </div>
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
                user: { full_name: selectedCertificate.user.full_name },
                course: { title: selectedCertificate.course.title, duration_hours: selectedCertificate.course.duration_hours }
              }}
              elementId="certificate-pdf"
              showGrade={false}
            />
          </div>
        </div>
      )}
    </div>
  )
}

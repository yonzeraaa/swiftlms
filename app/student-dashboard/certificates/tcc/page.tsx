'use client'

import { useState, useEffect } from 'react'
import { FileText, Upload, Check, Clock, AlertCircle, Mail, Award, BookOpen, XCircle, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { getTCCSubmissionData, submitTCC } from '@/lib/actions/tcc-submissions'
import { ClassicRule, CornerBracket } from '@/app/components/ui/RenaissanceSvgs'
import Spinner from '../../../components/ui/Spinner'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

interface TccSubmission {
  id: string
  title: string
  description: string | null
  course_id: string
  enrollment_id: string
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  grade: number | null
  feedback: string | null
  submission_date: string
  evaluated_at: string | null
  file_url: string | null
  course?: { title: string }
}

interface EnrollmentWithCourse {
  id: string
  course_id: string
  course: { id: string; title: string }
}

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

export default function TccSubmissionPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([])
  const [tccSubmissions, setTccSubmissions] = useState<TccSubmission[]>([])
  const [selectedEnrollment, setSelectedEnrollment] = useState<string>('')
  const [formData, setFormData] = useState({ title: '', description: '', file_url: '' })
  const [adminEmail, setAdminEmail] = useState('admin@swiftedu.com')

  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const data = await getTCCSubmissionData()
      if (!data) { router.push('/'); return; }
      const { enrollments: enrollmentsData, submissions: tccData, adminEmail: adminEmailData } = data
      if (enrollmentsData) {
        setEnrollments(enrollmentsData as any)
        if (enrollmentsData.length > 0) setSelectedEnrollment(enrollmentsData[0].id)
      }
      if (tccData) setTccSubmissions(tccData as any)
      if (adminEmailData) setAdminEmail(adminEmailData)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEnrollment || !formData.title) { toast.error('Preencha os campos obrigatórios'); return; }
    setSubmitting(true)
    try {
      const enrollment = enrollments.find(e => e.id === selectedEnrollment)
      if (!enrollment) return
      const existing = tccSubmissions.find(tcc => tcc.enrollment_id === selectedEnrollment)
      if (existing && existing.status === 'approved') { toast.error('TCC já aprovado'); return; }
      const result = await submitTCC({ title: formData.title, course_id: enrollment.course_id, enrollment_id: selectedEnrollment, document_url: formData.file_url || undefined, description: formData.description || undefined })
      if (!result.success) throw new Error(result.error)
      toast.success('TCC enviado com sucesso!')
      setFormData({ title: '', description: '', file_url: '' })
      await fetchData()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao enviar TCC.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Spinner fullPage size="xl" />
  }

  return (
    <div className="flex flex-col">
      <div className="text-center flex flex-col items-center mb-12">
        <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.5rem', fontWeight: 700, color: INK, marginBottom: '0.5rem' }}>
          Trabalho de Conclusão de Curso
        </h1>
        <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontStyle: 'italic', color: MUTED }}>
          A última etapa para a conquista do seu diploma de excelência
        </p>
        <ClassicRule style={{ width: '100%', maxWidth: '300px', marginTop: '2.5rem', color: INK }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
        {/* Lado Esquerdo: Instruções e Submissões */}
        <div className="lg:col-span-2 space-y-10">
          <div style={{ backgroundColor: '#1e130c/[0.02]', border: `1px dashed ${BORDER}`, padding: '2rem' }}>
            <h3 style={{ fontFamily: 'var(--font-playfair)', fontWeight: 600, color: INK, marginBottom: '1rem' }}>Instruções do Exame</h3>
            <ul style={{ fontFamily: 'var(--font-lora)', fontSize: '0.9rem', color: MUTED, lineHeight: 1.6 }} className="space-y-3">
              <li>1. Redija seu trabalho seguindo as normas acadêmicas.</li>
              <li>2. Realize o upload em um serviço de nuvem (Drive, Dropbox).</li>
              <li>3. Informe o link e o resumo no formulário ao lado.</li>
              <li>4. O conselho administrativo avaliará seu trabalho em breve.</li>
            </ul>
            <div className="mt-6 pt-4 border-t border-[#1e130c]/10">
              <p style={{ fontSize: '0.8rem', color: MUTED }}><Mail size={12} className="inline mr-2" /> Suporte: {adminEmail}</p>
            </div>
          </div>

          {tccSubmissions.length > 0 && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.25rem', color: INK, marginBottom: '1.5rem' }}>Registros de Envio</h3>
              <div className="space-y-6">
                {tccSubmissions.map(sub => (
                  <div key={sub.id} style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: '1.5rem' }}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 style={{ fontFamily: 'var(--font-lora)', fontWeight: 600, color: INK, fontSize: '1rem' }}>{sub.title}</h4>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 700, 
                        textTransform: 'uppercase', 
                        color: sub.status === 'approved' ? INK : sub.status === 'rejected' ? MUTED : ACCENT 
                      }}>
                        {sub.status === 'approved' ? 'Aprovado' : sub.status === 'pending' ? 'Em Análise' : 'Reprovado'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: MUTED, fontStyle: 'italic' }}>Curso: {sub.course?.title}</p>
                    {sub.grade && <p style={{ fontSize: '0.9rem', color: INK, fontWeight: 700, marginTop: '0.5rem' }}>Nota Final: {sub.grade.toFixed(1)}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lado Direito: Formulário */}
        <div className="lg:col-span-3">
          <div style={{ backgroundColor: PARCH, border: `1px solid ${BORDER}`, padding: '3rem', position: 'relative' }}>
            <div className="absolute top-4 left-4 w-8 h-8"><CornerBracket size={32} /></div>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div className="flex flex-col">
                  <label style={{ fontFamily: 'var(--font-lora)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', color: MUTED }}>Selecione o Curso</label>
                  <select
                    value={selectedEnrollment}
                    onChange={(e) => setSelectedEnrollment(e.target.value)}
                    style={{ padding: '0.75rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-lora)' }}
                    required
                  >
                    {enrollments.map(e => <option key={e.id} value={e.id}>{e.course.title}</option>)}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label style={{ fontFamily: 'var(--font-lora)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', color: MUTED }}>Título da Tese</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    style={{ padding: '0.75rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-lora)' }}
                    placeholder="Título oficial do trabalho"
                    required
                  />
                </div>

                <div className="flex flex-col">
                  <label style={{ fontFamily: 'var(--font-lora)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', color: MUTED }}>Resumo do Estudo</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{ padding: '0.75rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-lora)', minHeight: '120px' }}
                    placeholder="Breve descrição dos objetivos e resultados"
                  />
                </div>

                <div className="flex flex-col">
                  <label style={{ fontFamily: 'var(--font-lora)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', color: MUTED }}>Link do Documento Digital</label>
                  <input
                    type="url"
                    value={formData.file_url}
                    onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                    style={{ padding: '0.75rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-lora)' }}
                    placeholder="https://link-do-seu-trabalho.com/pdf"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ 
                    padding: '1rem 3rem', 
                    backgroundColor: INK, 
                    color: PARCH, 
                    border: 'none', 
                    cursor: submitting ? 'not-allowed' : 'pointer', 
                    fontFamily: 'var(--font-lora)', 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.15em',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Enviando...' : 'Submeter TCC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

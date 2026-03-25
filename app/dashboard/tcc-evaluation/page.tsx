'use client'

import { useState, useEffect } from 'react'
import { FileText, Check, Clock, CheckCircle, XCircle, User, Calendar, Download, X, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { getTccSubmissionsData, evaluateTccSubmission } from '@/lib/actions/admin-tcc'
import Spinner from '@/app/components/ui/Spinner'
import { ClassicRule } from '@/app/components/ui/RenaissanceSvgs'

interface TccSubmission {
  id: string
  title: string
  description: string | null
  course_id: string
  enrollment_id: string
  user_id: string
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  grade: number | null
  feedback: string | null
  submission_date: string
  evaluated_at: string | null
  file_url: string | null
  user?: {
    full_name: string
    email: string
  }
  course?: {
    title: string
  }
}

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

export default function TccEvaluationPage() {
  const [loading, setLoading] = useState(true)
  const [submissions, setSubmissions] = useState<TccSubmission[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<TccSubmission | null>(null)
  const [evaluating, setEvaluating] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewing' | 'approved' | 'rejected'>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [evaluationForm, setEvaluationForm] = useState({
    grade: '',
    feedback: '',
    status: 'approved' as 'approved' | 'rejected'
  })

  const router = useRouter()

  useEffect(() => {
    checkAdminAndFetchData()
  }, [filter])

  const checkAdminAndFetchData = async () => {
    try {
      const result = await getTccSubmissionsData(filter)
      if (result.success) {
        setSubmissions(result.submissions as any)
      } else {
        if (result.error === 'Não autenticado') router.push('/')
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleEvaluate = async () => {
    if (!selectedSubmission) return
    const grade = parseFloat(evaluationForm.grade)
    if (isNaN(grade) || grade < 0 || grade > 100) { toast.error('Nota inválida'); return }
    if (!evaluationForm.feedback.trim()) { toast.error('Parecer obrigatório'); return }

    setEvaluating(true)
    try {
      const result = await evaluateTccSubmission({
        submissionId: selectedSubmission.id,
        grade,
        feedback: evaluationForm.feedback,
        status: evaluationForm.status
      })

      if (result.success) {
        toast.success('Avaliação registrada!')
        setEvaluationForm({ grade: '', feedback: '', status: 'approved' })
        setSelectedSubmission(null)
        await checkAdminAndFetchData()
      } else {
        toast.error(result.error || 'Erro ao avaliar')
      }
    } catch (error) {
      toast.error('Erro no processamento')
    } finally {
      setEvaluating(false)
    }
  }

  const filteredSubmissions = submissions.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.user?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <Spinner fullPage size="xl" />

  return (
    <div className="flex flex-col w-full">
      {/* ── Cabeçalho Principal ── */}
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 w-full border-b border-[#1e130c]/10 pb-8">
        <div className="flex-1">
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 700, color: INK, lineHeight: 1 }}>
            Avaliação de TCCs
          </h1>
          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontStyle: 'italic', color: MUTED, marginTop: '0.5rem' }}>
            Despacho oficial e análise de trabalhos de conclusão de curso
          </p>
          <div className="mt-6 w-full max-w-md">
            <ClassicRule color={INK} />
          </div>
        </div>
      </div>

      {/* ── Métricas ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
        {[
          { label: 'Aguardando', value: submissions.filter(s => s.status === 'pending').length, color: ACCENT },
          { label: 'Em Análise', value: submissions.filter(s => s.status === 'reviewing').length, color: MUTED },
          { label: 'Deferidos', value: submissions.filter(s => s.status === 'approved').length, color: INK },
          { label: 'Impugnados', value: submissions.filter(s => s.status === 'rejected').length, color: MUTED }
        ].map((s, idx) => (
          <div key={idx} className="border border-[#1e130c]/10 bg-[#1e130c]/[0.02] flex items-center px-6 py-4 justify-between">
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</span>
            <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '2rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* ── Filtros e Busca ── */}
      <div className="flex flex-col lg:flex-row gap-8 mb-8 items-end">
        <div className="flex-1 flex gap-8 border-b border-[#1e130c]/10">
          {(['all', 'pending', 'reviewing', 'approved', 'rejected'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                background: 'none', border: 'none',
                borderBottom: filter === status ? `2px solid ${INK}` : '2px solid transparent',
                padding: '0.75rem 0', color: filter === status ? INK : MUTED,
                fontFamily: 'var(--font-lora)', fontWeight: filter === status ? 700 : 400,
                fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer'
              }}
            >
              {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendentes' : status === 'reviewing' ? 'Análise' : status === 'approved' ? 'Aprovados' : 'Reprovados'}
            </button>
          ))}
        </div>
        <div className="w-full lg:w-80 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a6350]" />
          <input
            type="text"
            placeholder="Buscar por título ou aluno..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-lora)' }}
          />
        </div>
      </div>

      {/* ── Tabela de Submissões ── */}
      <div className="w-full overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse min-w-[1000px]">
          <thead>
            <tr style={{ borderBottom: `2px solid ${INK}` }}>
              <th className="px-4 py-4 text-left" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Trabalho de Conclusão</th>
              <th className="px-4 py-4 text-left w-64" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Aluno</th>
              <th className="px-4 py-4 text-left w-64" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Compêndio / Curso</th>
              <th className="px-4 py-4 text-left w-40" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Data de Envio</th>
              <th className="px-4 py-4 text-left w-40" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Situação</th>
              <th className="px-4 py-4 text-right w-32" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubmissions.length > 0 ? filteredSubmissions.map(sub => (
              <tr key={sub.id} style={{ borderBottom: `1px dashed ${BORDER}` }} className="hover:bg-[#1e130c]/[0.02] transition-colors group">
                <td className="px-4 py-6 align-top">
                  <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', fontWeight: 600, color: INK }}>{sub.title}</span>
                  {sub.grade && <p className="text-xs font-bold mt-1" style={{ color: INK, opacity: 0.8 }}>Nota Final: {sub.grade.toFixed(1)}</p>}
                </td>
                <td className="px-4 py-6 align-top">
                  <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.95rem', color: INK }}>{sub.user?.full_name}</span>
                  <p className="text-xs italic text-[#7a6350]">{sub.user?.email}</p>
                </td>
                <td className="px-4 py-6 align-top">
                  <span style={{ fontFamily: 'var(--font-lora)', fontSize: '0.95rem', color: INK }}>{sub.course?.title}</span>
                </td>
                <td className="px-4 py-6 align-top text-sm" style={{ fontFamily: 'var(--font-lora)' }}>
                  {new Date(sub.submission_date).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-6 align-top">
                  <span style={{ 
                    fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', 
                    padding: '0.2rem 0.5rem', border: `1px solid ${sub.status === 'approved' ? INK : ACCENT}`,
                    color: sub.status === 'approved' ? INK : ACCENT
                  }}>
                    {sub.status === 'pending' ? 'Pendente' : sub.status}
                  </span>
                </td>
                <td className="px-4 py-6 text-right align-top">
                  <button
                    onClick={() => {
                      setSelectedSubmission(sub)
                      if (sub.status !== 'approved' && sub.status !== 'rejected') {
                        setEvaluationForm({ grade: sub.grade?.toString() || '', feedback: sub.feedback || '', status: 'approved' })
                      }
                    }}
                    style={{ padding: '0.5rem 1rem', background: 'none', border: `1px solid ${INK}`, color: INK, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}
                  >
                    {sub.status === 'approved' || sub.status === 'rejected' ? 'Revisar' : 'Avaliar'}
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="py-20 text-center italic text-[#7a6350]">Nenhuma submissão localizada para os filtros atuais.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal de Avaliação (Folha de Despacho) ── */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-[#1e130c]/70 backdrop-blur-md flex items-center justify-center z-[10000] p-4">
          <div className="bg-[#faf6ee] w-full max-w-3xl relative border-2 border-[#1e130c] shadow-2xl p-12 overflow-y-auto custom-scrollbar max-h-[95vh] font-[family-name:var(--font-lora)]">

            <button onClick={() => setSelectedSubmission(null)} className="absolute top-6 right-6 text-[#1e130c]/40 hover:text-[#1e130c] transition-colors"><X size={32} /></button>
            
            <div className="text-center mb-10">
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-[#7a6350] mb-4 block">Folha de Despacho Técnico</span>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.5rem', color: INK, fontWeight: 700 }}>{selectedSubmission.title}</h2>
              
              <p className="italic text-[#7a6350] text-lg px-8">"{selectedSubmission.description || 'Sem descrição adicional.'}"</p>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-10 py-6 border-y border-[#1e130c]/10">
              <div className="space-y-4">
                <p><span className="text-[0.65rem] font-bold uppercase tracking-widest text-[#7a6350] block mb-1">Aluno</span><span className="text-lg font-bold">{selectedSubmission.user?.full_name}</span></p>
                <p><span className="text-[0.65rem] font-bold uppercase tracking-widest text-[#7a6350] block mb-1">Data de Submissão</span><span className="text-lg">{new Date(selectedSubmission.submission_date).toLocaleDateString('pt-BR')}</span></p>
              </div>
              <div className="space-y-4">
                <p><span className="text-[0.65rem] font-bold uppercase tracking-widest text-[#7a6350] block mb-1">Compêndio</span><span className="text-lg">{selectedSubmission.course?.title}</span></p>
                {selectedSubmission.file_url && (
                  <a href={selectedSubmission.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#8b6d22] font-bold uppercase tracking-widest text-[0.65rem] hover:underline pt-2">
                    <Download size={14} /> Baixar Documento do Trabalho
                  </a>
                )}
              </div>
            </div>

            {selectedSubmission.status === 'pending' || selectedSubmission.status === 'reviewing' ? (
              <form onSubmit={(e) => { e.preventDefault(); handleEvaluate(); }} className="space-y-8">
                <div className="grid grid-cols-3 gap-8">
                  <div className="col-span-1">
                    <label className="text-[0.7rem] font-bold uppercase text-muted tracking-[0.2em] block mb-2">Nota Final</label>
                    <input
                      type="number" step="0.1" min="0" max="100"
                      value={evaluationForm.grade}
                      onChange={(e) => setEvaluationForm({ ...evaluationForm, grade: e.target.value })}
                      style={{ width: '100%', padding: '1rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-playfair)', fontSize: '2rem', textAlign: 'center' }}
                      placeholder="0.0"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[0.7rem] font-bold uppercase text-muted tracking-[0.2em] block mb-2">Veredito</label>
                    <div className="flex gap-4 h-[60px]">
                      <button
                        type="button"
                        onClick={() => setEvaluationForm({ ...evaluationForm, status: 'approved' })}
                        className="flex-1 border font-bold uppercase tracking-widest text-xs transition-colors"
                        style={{ 
                          borderColor: INK, 
                          backgroundColor: evaluationForm.status === 'approved' ? INK : 'transparent', 
                          color: evaluationForm.status === 'approved' ? PARCH : INK 
                        }}
                      >
                        Deferir
                      </button>
                      <button
                        type="button"
                        onClick={() => setEvaluationForm({ ...evaluationForm, status: 'rejected' })}
                        className="flex-1 border font-bold uppercase tracking-widest text-xs transition-colors"
                        style={{ 
                          borderColor: MUTED, 
                          backgroundColor: evaluationForm.status === 'rejected' ? MUTED : 'transparent', 
                          color: evaluationForm.status === 'rejected' ? PARCH : MUTED 
                        }}
                      >
                        Impugnar
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[0.7rem] font-bold uppercase text-muted tracking-[0.2em] block mb-2">Parecer Técnico e Observações</label>
                  <textarea
                    value={evaluationForm.feedback}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, feedback: e.target.value })}
                    style={{ width: '100%', padding: '1.5rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, minHeight: '150px', fontStyle: 'italic', fontSize: '1.1rem', lineHeight: 1.6 }}
                    placeholder="Redija aqui sua análise técnica sobre a qualidade e os resultados do trabalho..."
                    required
                  />
                </div>

                <div className="flex justify-end gap-6 pt-6">
                  <button type="button" onClick={() => setSelectedSubmission(null)} style={{ padding: '1rem 2rem', background: 'none', border: `1px solid ${INK}`, color: INK, cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase' }}>Cancelar</button>
                  <button type="submit" disabled={evaluating} style={{ padding: '1rem 4rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {evaluating ? 'Processando...' : 'Registrar Decisão Oficial'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-6">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-[#7a6350] mb-8">Decisão Registrada</p>
                <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '5rem', fontWeight: 700, color: INK, lineHeight: 1 }}>
                  {selectedSubmission.grade?.toFixed(1)}
                </div>
                <div className="mt-10 p-8 bg-white/40 border border-[#1e130c]/5 italic text-[#1e130c] text-lg leading-relaxed text-left">
                  "{selectedSubmission.feedback}"
                </div>
                {selectedSubmission.evaluated_at && (
                  <p className="mt-8 text-[0.7rem] uppercase tracking-[0.2em] text-muted">Autenticado em: {new Date(selectedSubmission.evaluated_at).toLocaleDateString('pt-BR')}</p>
                )}
                <div className="mt-12">
                  <button onClick={() => setSelectedSubmission(null)} style={{ padding: '1rem 3rem', background: 'none', border: `1px solid ${INK}`, color: INK, cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase' }}>Voltar ao Livro de Registros</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

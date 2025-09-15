'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Send, Clock, CheckCircle, XCircle, AlertCircle, Award, User, Calendar, MessageSquare, Download } from 'lucide-react'
import Card from '@/app/components/Card'
import Button from '@/app/components/Button'
import Breadcrumbs from '@/app/components/ui/Breadcrumbs'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

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

export default function TccEvaluationPage() {
  const [loading, setLoading] = useState(true)
  const [submissions, setSubmissions] = useState<TccSubmission[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<TccSubmission | null>(null)
  const [evaluating, setEvaluating] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewing' | 'approved' | 'rejected'>('pending')
  const [evaluationForm, setEvaluationForm] = useState({
    grade: '',
    feedback: '',
    status: 'approved' as 'approved' | 'rejected'
  })

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAdminAndFetchData()
  }, [filter])

  const checkAdminAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      // Verificar se é admin ou instrutor
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || (profile.role !== 'admin' && profile.role !== 'instructor')) {
        router.push('/dashboard')
        return
      }

      // Buscar submissões de TCC
      let query = supabase
        .from('tcc_submissions')
        .select(`
          *,
          user:profiles!tcc_submissions_user_id_fkey(full_name, email),
          course:courses(title)
        `)
        .order('submission_date', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data: submissionsData } = await query

      if (submissionsData) {
        setSubmissions(submissionsData as any)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEvaluate = async () => {
    if (!selectedSubmission) return

    const grade = parseFloat(evaluationForm.grade)
    if (isNaN(grade) || grade < 0 || grade > 100) {
      toast.error('A nota deve ser um número entre 0 e 100')
      return
    }

    if (!evaluationForm.feedback) {
      toast.error('Por favor, forneça um feedback')
      return
    }

    setEvaluating(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Atualizar submissão com avaliação
      const { error } = await supabase
        .from('tcc_submissions')
        .update({
          grade,
          feedback: evaluationForm.feedback,
          status: evaluationForm.status,
          evaluated_by: user.id,
          evaluated_at: new Date().toISOString()
        })
        .eq('id', selectedSubmission.id)

      if (error) throw error

      // Se aprovado, calcular nota final e atualizar certificado
      if (evaluationForm.status === 'approved') {
        // Calcular nota final usando a função do banco
        const { data: finalGradeData } = await supabase
          .rpc('calculate_final_grade', {
            p_enrollment_id: selectedSubmission.enrollment_id
          })

        if (finalGradeData !== null) {
          // Verificar se já existe certificado
          const { data: existingCert } = await supabase
            .from('certificates')
            .select('id')
            .eq('enrollment_id', selectedSubmission.enrollment_id)
            .single()

          if (existingCert) {
            // Atualizar certificado existente
            await supabase
              .from('certificates')
              .update({
                tcc_id: selectedSubmission.id,
                final_grade: finalGradeData,
                approval_status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: user.id
              })
              .eq('id', existingCert.id)
          } else {
            // Criar novo certificado
            const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
            const verificationCode = `VER-${Math.random().toString(36).substr(2, 12).toUpperCase()}`

            await supabase
              .from('certificates')
              .insert({
                user_id: selectedSubmission.user_id,
                course_id: selectedSubmission.course_id,
                enrollment_id: selectedSubmission.enrollment_id,
                certificate_number: certificateNumber,
                verification_code: verificationCode,
                tcc_id: selectedSubmission.id,
                final_grade: finalGradeData,
                grade: finalGradeData,
                approval_status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: user.id
              })
          }
        }
      }

      toast.success('TCC avaliado com sucesso!')

      // Limpar formulário
      setEvaluationForm({
        grade: '',
        feedback: '',
        status: 'approved'
      })
      setSelectedSubmission(null)

      // Recarregar dados
      await checkAdminAndFetchData()
    } catch (error) {
      console.error('Erro ao avaliar TCC:', error)
      toast.error('Erro ao avaliar TCC. Tente novamente.')
    } finally {
      setEvaluating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
            <Clock className="w-4 h-4" />
            Aguardando
          </span>
        )
      case 'reviewing':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
            <AlertCircle className="w-4 h-4" />
            Em Análise
          </span>
        )
      case 'approved':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
            <CheckCircle className="w-4 h-4" />
            Aprovado
          </span>
        )
      case 'rejected':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
            <XCircle className="w-4 h-4" />
            Reprovado
          </span>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs className="mb-2" />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gold flex items-center gap-2">
          <FileText className="w-8 h-8 text-gold-400" />
          Avaliação de TCCs
        </h1>
        <p className="text-gold-300 mt-1">
          Avalie os trabalhos de conclusão de curso dos alunos
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-400">
                {submissions.filter(s => s.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>

        <Card className="p-4 border-blue-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Em Análise</p>
              <p className="text-2xl font-bold text-blue-400">
                {submissions.filter(s => s.status === 'reviewing').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-4 border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Aprovados</p>
              <p className="text-2xl font-bold text-green-400">
                {submissions.filter(s => s.status === 'approved').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-4 border-red-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Reprovados</p>
              <p className="text-2xl font-bold text-red-400">
                {submissions.filter(s => s.status === 'rejected').length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex gap-2">
          {(['all', 'pending', 'reviewing', 'approved', 'rejected'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg transition-all ${
                filter === status
                  ? 'bg-gold-500 text-navy-900 font-medium'
                  : 'bg-navy-800/50 text-gold-300 hover:bg-navy-700/50'
              }`}
            >
              {status === 'all' ? 'Todos' :
               status === 'pending' ? 'Pendentes' :
               status === 'reviewing' ? 'Em Análise' :
               status === 'approved' ? 'Aprovados' : 'Reprovados'}
            </button>
          ))}
        </div>
      </Card>

      {/* Lista de Submissões */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gold mb-4">Submissões de TCC</h2>

          {submissions.length === 0 ? (
            <p className="text-gold-400 text-center py-8">
              Nenhuma submissão encontrada
            </p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {submissions.map(submission => (
                <div
                  key={submission.id}
                  className={`p-4 bg-navy-800/30 rounded-lg border cursor-pointer transition-all ${
                    selectedSubmission?.id === submission.id
                      ? 'border-gold-500 bg-navy-800/50'
                      : 'border-gold-500/20 hover:border-gold-500/40'
                  }`}
                  onClick={() => setSelectedSubmission(submission)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gold">{submission.title}</p>
                      <p className="text-sm text-gold-300">{submission.course?.title}</p>
                    </div>
                    {getStatusBadge(submission.status)}
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gold-400">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {submission.user?.full_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(submission.submission_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {submission.grade && (
                    <div className="mt-2">
                      <span className="text-sm text-gold-300">Nota: </span>
                      <span className={`font-bold ${
                        submission.grade >= 70 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {submission.grade.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Formulário de Avaliação */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gold mb-4">Avaliar TCC</h2>

          {selectedSubmission ? (
            <div className="space-y-4">
              {/* Detalhes da Submissão */}
              <div className="p-4 bg-navy-800/30 rounded-lg">
                <h3 className="font-semibold text-gold mb-2">{selectedSubmission.title}</h3>
                {selectedSubmission.description && (
                  <p className="text-sm text-gold-300 mb-3">{selectedSubmission.description}</p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gold-400" />
                    <span className="text-gold-300">Aluno:</span>
                    <span className="text-gold-100">{selectedSubmission.user?.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-gold-400" />
                    <span className="text-gold-300">Curso:</span>
                    <span className="text-gold-100">{selectedSubmission.course?.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gold-400" />
                    <span className="text-gold-300">Enviado em:</span>
                    <span className="text-gold-100">
                      {new Date(selectedSubmission.submission_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  {selectedSubmission.file_url && (
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-gold-400" />
                      <a
                        href={selectedSubmission.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        Ver arquivo do TCC
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Formulário de Avaliação */}
              {selectedSubmission.status === 'pending' || selectedSubmission.status === 'reviewing' ? (
                <div className="space-y-4">
                  {/* Nota */}
                  <div>
                    <label className="block text-gold-300 text-sm font-medium mb-2">
                      Nota (0-100) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={evaluationForm.grade}
                      onChange={(e) => setEvaluationForm({ ...evaluationForm, grade: e.target.value })}
                      className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/30 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                      placeholder="Ex: 85.5"
                      required
                    />
                  </div>

                  {/* Feedback */}
                  <div>
                    <label className="block text-gold-300 text-sm font-medium mb-2">
                      Feedback <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={evaluationForm.feedback}
                      onChange={(e) => setEvaluationForm({ ...evaluationForm, feedback: e.target.value })}
                      className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/30 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                      placeholder="Forneça um feedback construtivo sobre o trabalho..."
                      rows={4}
                      required
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-gold-300 text-sm font-medium mb-2">
                      Decisão <span className="text-red-400">*</span>
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setEvaluationForm({ ...evaluationForm, status: 'approved' })}
                        className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                          evaluationForm.status === 'approved'
                            ? 'bg-green-500/20 border-green-500 text-green-400'
                            : 'bg-navy-900/50 border-gold-500/30 text-gold-300 hover:border-gold-500/50'
                        }`}
                      >
                        <CheckCircle className="w-5 h-5 inline mr-2" />
                        Aprovar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEvaluationForm({ ...evaluationForm, status: 'rejected' })}
                        className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                          evaluationForm.status === 'rejected'
                            ? 'bg-red-500/20 border-red-500 text-red-400'
                            : 'bg-navy-900/50 border-gold-500/30 text-gold-300 hover:border-gold-500/50'
                        }`}
                      >
                        <XCircle className="w-5 h-5 inline mr-2" />
                        Reprovar
                      </button>
                    </div>
                  </div>

                  {/* Botão de Envio */}
                  <Button
                    onClick={handleEvaluate}
                    variant="primary"
                    disabled={evaluating}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    {evaluating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-navy-900"></div>
                        Avaliando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Enviar Avaliação
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-navy-800/30 rounded-lg">
                  <p className="text-gold-300 mb-3">Este TCC já foi avaliado:</p>
                  <div className="space-y-2">
                    <div>
                      <span className="text-gold-400">Nota: </span>
                      <span className={`font-bold ${
                        selectedSubmission.grade! >= 70 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {selectedSubmission.grade?.toFixed(1)}
                      </span>
                    </div>
                    {selectedSubmission.feedback && (
                      <div>
                        <p className="text-gold-400 mb-1">Feedback:</p>
                        <p className="text-gold-200 text-sm">{selectedSubmission.feedback}</p>
                      </div>
                    )}
                    {selectedSubmission.evaluated_at && (
                      <p className="text-sm text-gold-400">
                        Avaliado em: {new Date(selectedSubmission.evaluated_at).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gold-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Selecione uma submissão para avaliar</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
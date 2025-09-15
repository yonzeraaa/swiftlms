'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Upload, Send, Clock, CheckCircle, XCircle, AlertCircle, Mail, Award, BookOpen } from 'lucide-react'
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
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  grade: number | null
  feedback: string | null
  submission_date: string
  evaluated_at: string | null
  file_url: string | null
  course?: {
    title: string
  }
}

interface EnrollmentWithCourse {
  id: string
  course_id: string
  course: {
    id: string
    title: string
  }
}

export default function TccSubmissionPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([])
  const [tccSubmissions, setTccSubmissions] = useState<TccSubmission[]>([])
  const [selectedEnrollment, setSelectedEnrollment] = useState<string>('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file_url: ''
  })
  const [adminEmail, setAdminEmail] = useState('admin@swiftedu.com')

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      // Buscar matrículas do aluno
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select(`
          id,
          course_id,
          course:courses(id, title)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (enrollmentsData) {
        setEnrollments(enrollmentsData as any)
        if (enrollmentsData.length > 0) {
          setSelectedEnrollment(enrollmentsData[0].id)
        }
      }

      // Buscar submissões de TCC existentes
      const { data: tccData } = await supabase
        .from('tcc_submissions')
        .select(`
          *,
          course:courses(title)
        `)
        .eq('user_id', user.id)
        .order('submission_date', { ascending: false })

      if (tccData) {
        setTccSubmissions(tccData as any)
      }

      // Buscar email do admin
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('role', 'admin')
        .limit(1)
        .single()

      if (adminProfile) {
        setAdminEmail(adminProfile.email)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedEnrollment) {
      toast.error('Selecione um curso')
      return
    }

    if (!formData.title) {
      toast.error('Digite o título do TCC')
      return
    }

    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const enrollment = enrollments.find(e => e.id === selectedEnrollment)
      if (!enrollment) return

      // Verificar se já existe submissão para este enrollment
      const existingSubmission = tccSubmissions.find(
        tcc => tcc.enrollment_id === selectedEnrollment
      )

      if (existingSubmission && existingSubmission.status === 'approved') {
        toast.error('Você já tem um TCC aprovado para este curso')
        return
      }

      // Criar ou atualizar submissão
      const submissionData = {
        user_id: user.id,
        course_id: enrollment.course_id,
        enrollment_id: selectedEnrollment,
        title: formData.title,
        description: formData.description || null,
        file_url: formData.file_url || null,
        status: 'pending' as const
      }

      let result
      if (existingSubmission) {
        // Atualizar submissão existente
        result = await supabase
          .from('tcc_submissions')
          .update({
            ...submissionData,
            submission_date: new Date().toISOString()
          })
          .eq('id', existingSubmission.id)
          .select()
          .single()
      } else {
        // Criar nova submissão
        result = await supabase
          .from('tcc_submissions')
          .insert(submissionData)
          .select()
          .single()
      }

      if (result.error) throw result.error

      toast.success('TCC enviado com sucesso! O administrador foi notificado.')

      // Limpar formulário
      setFormData({
        title: '',
        description: '',
        file_url: ''
      })

      // Recarregar dados
      await fetchData()
    } catch (error) {
      console.error('Erro ao enviar TCC:', error)
      toast.error('Erro ao enviar TCC. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string, grade?: number | null) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
            <Clock className="w-4 h-4" />
            Aguardando Avaliação
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
            Aprovado {grade && `- Nota: ${grade}`}
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
          Trabalho de Conclusão de Curso (TCC)
        </h1>
        <p className="text-gold-300 mt-1">
          Envie seu TCC para avaliação e liberação do certificado
        </p>
      </div>

      {/* Instruções */}
      <Card className="p-6 border-blue-500/30 bg-blue-500/10">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-gold mb-2">Como funciona o processo:</h3>
            <ol className="list-decimal list-inside space-y-1 text-gold-300">
              <li>Envie seu TCC através do formulário abaixo</li>
              <li>O administrador receberá uma notificação por email</li>
              <li>Seu trabalho será avaliado e receberá uma nota</li>
              <li>A nota final será calculada: (Média dos Testes × 1 + Nota do TCC × 2) ÷ 3</li>
              <li>Após aprovação, seu certificado será liberado</li>
            </ol>
            <p className="mt-3 text-sm text-gold-400">
              <Mail className="w-4 h-4 inline mr-1" />
              Email do administrador: <span className="font-medium">{adminEmail}</span>
            </p>
          </div>
        </div>
      </Card>

      {/* Formulário de Submissão */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-gold-400" />
          Enviar TCC
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seleção do Curso */}
          <div>
            <label className="block text-gold-300 text-sm font-medium mb-2">
              Curso <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedEnrollment}
              onChange={(e) => setSelectedEnrollment(e.target.value)}
              className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/30 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
              required
              disabled={enrollments.length === 0}
            >
              {enrollments.length === 0 ? (
                <option value="">Nenhum curso encontrado</option>
              ) : (
                enrollments.map(enrollment => {
                  const existingSubmission = tccSubmissions.find(
                    tcc => tcc.enrollment_id === enrollment.id
                  )
                  return (
                    <option key={enrollment.id} value={enrollment.id}>
                      {enrollment.course.title}
                      {existingSubmission && ` - ${existingSubmission.status === 'approved' ? 'TCC Aprovado' : 'TCC Enviado'}`}
                    </option>
                  )
                })
              )}
            </select>
          </div>

          {/* Título do TCC */}
          <div>
            <label className="block text-gold-300 text-sm font-medium mb-2">
              Título do TCC <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/30 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="Digite o título do seu trabalho"
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-gold-300 text-sm font-medium mb-2">
              Descrição / Resumo
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/30 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="Descreva brevemente seu trabalho"
              rows={4}
            />
          </div>

          {/* Link do Arquivo */}
          <div>
            <label className="block text-gold-300 text-sm font-medium mb-2">
              Link do Arquivo (Google Drive, Dropbox, etc.)
            </label>
            <input
              type="url"
              value={formData.file_url}
              onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
              className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/30 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="https://drive.google.com/..."
            />
            <p className="text-xs text-gold-400 mt-1">
              Faça upload do arquivo em um serviço de nuvem e cole o link aqui
            </p>
          </div>

          {/* Botão de Envio */}
          <div className="flex justify-end gap-3">
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || enrollments.length === 0}
              className="flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-navy-900"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar TCC
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Lista de Submissões */}
      {tccSubmissions.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-gold-400" />
            Minhas Submissões
          </h2>

          <div className="space-y-4">
            {tccSubmissions.map(submission => (
              <div
                key={submission.id}
                className="p-4 bg-navy-800/30 rounded-lg border border-gold-500/20"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <BookOpen className="w-5 h-5 text-gold-400" />
                      <h3 className="font-semibold text-gold">
                        {submission.course?.title}
                      </h3>
                      {getStatusBadge(submission.status, submission.grade)}
                    </div>

                    <p className="text-gold-100 font-medium mb-1">
                      {submission.title}
                    </p>

                    {submission.description && (
                      <p className="text-gold-300 text-sm mb-2">
                        {submission.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-gold-400">
                      <span>
                        Enviado em: {new Date(submission.submission_date).toLocaleDateString('pt-BR')}
                      </span>
                      {submission.evaluated_at && (
                        <span>
                          Avaliado em: {new Date(submission.evaluated_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                      {submission.file_url && (
                        <a
                          href={submission.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          Ver arquivo
                        </a>
                      )}
                    </div>

                    {submission.feedback && (
                      <div className="mt-3 p-3 bg-navy-900/50 rounded-lg">
                        <p className="text-sm text-gold-300 font-medium mb-1">Feedback do Avaliador:</p>
                        <p className="text-sm text-gold-200">{submission.feedback}</p>
                      </div>
                    )}

                    {submission.grade && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gold-300">Nota do TCC:</span>
                          <span className={`text-xl font-bold ${
                            submission.grade >= 70 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {submission.grade.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
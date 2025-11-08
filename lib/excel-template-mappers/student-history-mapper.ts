import { createClient } from '@/lib/supabase/client'
import { differenceInDays } from 'date-fns'
import { Calculators, Formatters, Helpers } from './shared-utils'
import type { ArrayMapping, TemplateMetadata } from '../excel-template-engine'

export interface StudentHistoryData {
  // Cabeçalho
  course_name: string
  category: string
  institution: string
  enrollment_date: string
  coordination: string
  student_name: string
  // Situação Acadêmica
  approval: string
  last_access: string
  tests_grade: string
  tcc_grade: string
  general_average: string
  // Tabela
  modules: ModuleRowData[]
  // Totais
  total_workload: number
  total_duration_days: string
}

export interface ModuleRowData {
  code: string
  name: string
  workload: number
  completion_date: string
  score: number | string
}

/**
 * Busca dados completos do histórico do aluno
 */
export async function fetchStudentHistoryData(userId: string): Promise<StudentHistoryData> {
  // Validação de entrada
  if (!userId || typeof userId !== 'string') {
    throw new Error('userId inválido ou não fornecido')
  }

  const supabase = createClient()

  // Buscar dados do aluno com enrollment (pegar a matrícula mais recente)
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .select(`
      *,
      course:courses(
        *,
        course_modules(
          *,
          lessons(*)
        )
      ),
      user:profiles(full_name, email)
    `)
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (enrollmentError) {
    console.error('Erro ao buscar enrollment:', enrollmentError)
    throw new Error(`Erro ao buscar histórico do aluno: ${enrollmentError.message}`)
  }

  if (!enrollment) {
    throw new Error('Nenhuma matrícula encontrada para este aluno')
  }

  // Validações defensivas
  if (!enrollment.course) {
    throw new Error('Curso não encontrado para a matrícula')
  }

  // Buscar todo o progresso de lições do aluno separadamente
  const { data: lessonProgressData } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', userId)

  // Criar mapa de progresso por lesson_id para acesso eficiente
  const progressByLessonId = new Map<string, any>()
  lessonProgressData?.forEach((progress: any) => {
    if (progress.lesson_id) {
      // Manter apenas o progresso mais recente por lição
      const existing = progressByLessonId.get(progress.lesson_id)
      if (!existing || new Date(progress.updated_at) > new Date(existing.updated_at)) {
        progressByLessonId.set(progress.lesson_id, progress)
      }
    }
  })

  // Buscar tentativas de testes
  const { data: testAttempts, error: testAttemptsError } = await supabase
    .from('test_attempts')
    .select('*, test:tests(*)')
    .eq('user_id', userId)

  if (testAttemptsError) {
    console.error('Erro ao buscar test attempts:', testAttemptsError)
  }

  // Calcular média dos testes
  const testScores = testAttempts?.map((ta: any) => ta.score).filter((s: number) => s > 0) || []
  const avgTests = Calculators.average(testScores)

  // Buscar nota do TCC
  const { data: tccSubmission } = await supabase
    .from('tcc_submissions')
    .select('grade')
    .eq('user_id', userId)
    .order('evaluated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const tccScore = tccSubmission?.grade != null ? Number(tccSubmission.grade) : 0

  // Média geral ponderada
  const mediaGeral = Calculators.generalAverage(avgTests, tccScore)

  // Buscar último acesso (usar maybeSingle para evitar erro se não houver registros)
  const { data: lastActivity } = await supabase
    .from('activity_logs')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Criar mapa de melhor nota por subject usando os testAttempts já buscados
  const bestScoreBySubject = new Map<string, number>()

  testAttempts?.forEach((attempt: any) => {
    // A estrutura é: attempt.test.subject_id
    const subjectId = attempt.test?.subject_id
    const score = attempt.score

    if (subjectId && score != null) {
      const currentBest = bestScoreBySubject.get(subjectId) || 0
      const numericScore = typeof score === 'string' ? parseFloat(score) : Number(score)

      if (numericScore > currentBest) {
        bestScoreBySubject.set(subjectId, numericScore)
      }
    }
  })

  // Buscar todos os subjects para fazer matching com lessons
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name')

  // Criar mapa de subject_id por código (primeiros 7 chars do name)
  const subjectByCode = new Map<string, any>()
  subjects?.forEach((subject: any) => {
    const code = subject.name?.substring(0, 7) // Ex: DLA0202
    if (code) {
      subjectByCode.set(code, subject)
    }
  })

  // Processar módulos e disciplinas com validações defensivas
  const modulesData: ModuleRowData[] = []
  let totalWorkload = 0
  let totalScore = 0
  let scoreCount = 0
  const completionDates: Date[] = []

  // Validar se existem módulos
  const modules = enrollment.course.course_modules || []

  if (modules.length === 0) {
    console.warn('Nenhum módulo encontrado para o curso')
  }

  modules.forEach((courseModule: any, moduleIndex: number) => {
    // Verificar se módulo existe
    if (!courseModule) return

    // Linha do módulo
    const moduleWorkload = courseModule.total_hours || 0
    totalWorkload += moduleWorkload

    modulesData.push({
      code: Formatters.moduleCode(moduleIndex),
      name: `Módulo ${courseModule.title || 'Sem título'}`,
      workload: moduleWorkload,
      completion_date: '',
      score: ''
    })

    // Disciplinas do módulo
    const lessons = courseModule.lessons || []

    lessons.forEach((lesson: any, lessonIndex: number) => {
      // Buscar progresso do mapa criado anteriormente
      const progress = progressByLessonId.get(lesson.id)

      // Extrair código da lesson (primeiros 7 chars do título)
      const lessonCode = lesson.title?.substring(0, 7) || ''

      // Buscar subject correspondente
      const subject = subjectByCode.get(lessonCode)

      // Buscar nota do teste deste subject
      const lessonScore = subject ? (bestScoreBySubject.get(subject.id) || 0) : 0

      if (progress?.completed_at) {
        try {
          const completedDate = new Date(progress.completed_at)
          if (!isNaN(completedDate.getTime())) {
            completionDates.push(completedDate)
          }
        } catch (e) {
          console.warn('Data de conclusão inválida:', progress.completed_at)
        }
      }

      if (typeof lessonScore === 'number' && lessonScore > 0) {
        totalScore += lessonScore
        scoreCount++
      }

      modulesData.push({
        code: Formatters.lessonCode(moduleIndex, lessonIndex),
        name: ` Disciplina ${lesson.title || 'Sem título'}`,
        workload: 0, // Sem horas para disciplinas individuais
        completion_date: Formatters.date(progress?.completed_at),
        score: lessonScore > 0 ? lessonScore : ''
      })
    })
  })

  // Calcular duração total em dias
  let totalDurationDays = '0 Dias'
  if (completionDates.length > 1) {
    const sortedDates = completionDates.sort((a, b) => a.getTime() - b.getTime())
    const firstDate = sortedDates[0]
    const lastDate = sortedDates[sortedDates.length - 1]
    const days = differenceInDays(lastDate, firstDate)
    totalDurationDays = `${days} Dias`
  }

  // Calcular média das pontuações
  const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0

  // Adicionar linha de TOTAIS ao array se houver dados
  if (modulesData.length > 0) {
    modulesData.push({
      code: 'TOTAIS',
      name: '',
      workload: totalWorkload,
      completion_date: totalDurationDays,
      score: averageScore > 0 ? Number(averageScore.toFixed(1)) : ''
    })
  } else {
    // Se não houver módulos, adicionar mensagem informativa
    modulesData.push({
      code: 'N/A',
      name: 'Nenhum módulo cadastrado para este curso',
      workload: 0,
      completion_date: '-',
      score: ''
    })
  }

  return {
    course_name: Helpers.defaultValue(enrollment?.course?.title, 'Curso não especificado'),
    category: enrollment?.course?.category || 'PÓS-GRADUAÇÃO LATO SENSU',
    institution: Formatters.institution(),
    enrollment_date: Formatters.date(enrollment?.enrolled_at) || '-',
    coordination: process.env.NEXT_PUBLIC_COORDINATION || 'A definir',
    student_name: Helpers.defaultValue(enrollment?.user?.full_name, 'Aluno'),
    approval: Calculators.isApproved(mediaGeral) ? 'Sim' : 'Não',
    last_access: Formatters.datetime(lastActivity?.created_at) || 'Sem registro',
    tests_grade: Number.isFinite(avgTests) ? avgTests.toFixed(1) : '0.0',
    tcc_grade: Number.isFinite(tccScore) ? tccScore.toFixed(1) : '0.0',
    general_average: Number.isFinite(mediaGeral) ? mediaGeral.toFixed(1) : '0.0',
    modules: modulesData,
    total_workload: totalWorkload,
    total_duration_days: totalDurationDays
  }
}

/**
 * Mapeia dados para formato compatível com template
 */
export function mapStudentHistoryDataForTemplate(data: StudentHistoryData): Record<string, any> {
  return {
    course_name: data.course_name,
    category: data.category,
    institution: data.institution,
    enrollment_date: data.enrollment_date,
    coordination: data.coordination,
    student_name: data.student_name,
    approval: data.approval,
    last_access: data.last_access,
    tests_grade: data.tests_grade,
    tcc_grade: data.tcc_grade,
    general_average: data.general_average,
    modules: data.modules,
    total_workload: data.total_workload,
    total_duration_days: data.total_duration_days
  }
}

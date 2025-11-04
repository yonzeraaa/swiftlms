import { createClient } from '@/lib/supabase/client'
import { format, differenceInDays } from 'date-fns'
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
  const supabase = createClient()

  // Buscar dados do aluno com enrollment
  const { data: enrollment, error } = await supabase
    .from('enrollments')
    .select(`
      *,
      course:courses(
        *,
        modules(
          *,
          lessons(
            *,
            lesson_progress!inner(*)
          )
        )
      ),
      user:profiles(full_name, email)
    `)
    .eq('user_id', userId)
    .single()

  if (error || !enrollment) {
    throw new Error('Erro ao buscar histórico do aluno')
  }

  // Buscar tentativas de testes
  const { data: testAttempts } = await supabase
    .from('test_attempts')
    .select('*, test:tests(*)')
    .eq('user_id', userId)

  // Calcular média dos testes
  const testScores = testAttempts?.map((ta: any) => ta.score).filter((s: number) => s > 0) || []
  const avgTests = testScores.length > 0
    ? testScores.reduce((a: number, b: number) => a + b, 0) / testScores.length
    : 0

  // Nota TCC (placeholder - implementar busca real depois)
  const tccScore = 72.0

  // Média geral ponderada: (testes + tcc*2) / 3
  const mediaGeral = ((avgTests * 1) + (tccScore * 2)) / 3

  // Buscar último acesso
  const { data: lastActivity } = await supabase
    .from('activity_logs')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Processar módulos e disciplinas
  const modulesData: ModuleRowData[] = []
  let totalWorkload = 0
  let totalScore = 0
  let scoreCount = 0
  const completionDates: Date[] = []

  enrollment.course.modules?.forEach((module: any, moduleIndex: number) => {
    // Linha do módulo
    const moduleWorkload = module.total_hours || 0
    totalWorkload += moduleWorkload

    modulesData.push({
      code: `CMN${(moduleIndex + 1).toString().padStart(2, '0')}`,
      name: `Módulo ${module.title}`,
      workload: moduleWorkload,
      completion_date: '',
      score: ''
    })

    // Disciplinas do módulo
    module.lessons?.forEach((lesson: any, lessonIndex: number) => {
      const progress = lesson.lesson_progress?.[0]
      const lessonWorkload = Math.round((lesson.duration_minutes || 0) / 60) // converter minutos para horas
      const lessonScore = progress?.score || 0

      totalWorkload += lessonWorkload

      if (progress?.completed_at) {
        completionDates.push(new Date(progress.completed_at))
      }

      if (typeof lessonScore === 'number' && lessonScore > 0) {
        totalScore += lessonScore
        scoreCount++
      }

      modulesData.push({
        code: `CMN${(moduleIndex + 1).toString().padStart(2, '0')}${(lessonIndex + 1).toString().padStart(2, '0')}`,
        name: ` Disciplina ${lesson.title}`,
        workload: lessonWorkload,
        completion_date: progress?.completed_at
          ? format(new Date(progress.completed_at), 'dd/MM/yyyy')
          : '',
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

  // Adicionar linha de TOTAIS ao array
  modulesData.push({
    code: 'TOTAIS',
    name: '',
    workload: totalWorkload,
    completion_date: totalDurationDays,
    score: averageScore > 0 ? Number(averageScore.toFixed(1)) : ''
  })

  return {
    course_name: enrollment.course.title || 'Curso não especificado',
    category: 'PÓS-GRADUAÇÃO LATO SENSU',
    institution: 'IPETEC / UCP',
    enrollment_date: enrollment.enrolled_at
      ? format(new Date(enrollment.enrolled_at), 'dd/MM/yyyy')
      : '',
    coordination: 'A definir', // TODO: Adicionar campo ao banco
    student_name: enrollment.user?.full_name || 'Aluno',
    approval: mediaGeral >= 70 ? 'Sim' : 'Não',
    last_access: lastActivity?.created_at
      ? format(new Date(lastActivity.created_at), 'dd/MM/yyyy HH:mm')
      : '-',
    tests_grade: avgTests.toFixed(1),
    tcc_grade: tccScore.toFixed(1),
    general_average: mediaGeral.toFixed(1),
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

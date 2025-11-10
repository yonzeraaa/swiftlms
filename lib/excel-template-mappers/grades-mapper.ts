import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import type { ArrayMapping, TemplateMetadata } from '../excel-template-engine'

export interface GradesReportData {
  institution: string
  report_date: string
  grades: GradeRowData[]
}

export interface GradeRowData {
  student_name: string
  email: string
  course: string
  subject: string
  test_title: string
  score: number
  max_score: number
  percentage: number
  attempt_date: string
  status: string
}

/**
 * Busca dados de notas do banco de dados
 */
export async function fetchGradesData(): Promise<GradesReportData> {
  const supabase = await createClient()

  try {
    // Buscar tentativas de testes com joins
    const { data: testAttempts, error: attemptsError } = await supabase
      .from('test_attempts')
      .select(`
        *,
        test:tests!inner(
          title,
          course_id,
          subject_id
        ),
        user:profiles!test_attempts_user_id_fkey(full_name, email)
      `)
      .or(`submitted_at.not.is.null,started_at.not.is.null`)
      .order('submitted_at', { ascending: false, nullsFirst: false })

    if (attemptsError) {
      throw new Error(`Erro ao buscar tentativas: ${attemptsError.message}`)
    }

    // Buscar informações de cursos e disciplinas
    const courseIds = [...new Set(testAttempts?.map((ta: any) => ta.test.course_id) || [])]
    const subjectIds = [...new Set(testAttempts?.map((ta: any) => ta.test.subject_id).filter(Boolean) || [])]

    const { data: courses } = await supabase
      .from('courses')
      .select('id, title')
      .in('id', courseIds)

    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name')
      .in('id', subjectIds)

    // Criar maps para lookup rápido
    const courseMap = new Map(courses?.map((c: any) => [c.id, c.title]) || [])
    const subjectMap = new Map(subjects?.map((s: any) => [s.id, s.name]) || [])

    // Processar dados das tentativas
    const gradesData: GradeRowData[] = []

    for (const attempt of testAttempts || []) {
      const score = attempt.score || 0
      // Max score is typically 100 for percentage-based scoring
      const maxScore = 100
      const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0

      gradesData.push({
        student_name: attempt.user?.full_name || 'Aluno desconhecido',
        email: attempt.user?.email || '',
        course: (courseMap.get(attempt.test.course_id) as string) || 'Curso não especificado',
        subject: (subjectMap.get(attempt.test.subject_id) as string) || 'Geral',
        test_title: attempt.test.title || 'Teste',
        score: Math.round(score * 10) / 10,
        max_score: maxScore,
        percentage: Math.round(percentage * 10) / 10,
        attempt_date: attempt.submitted_at
          ? format(new Date(attempt.submitted_at), 'dd/MM/yyyy HH:mm')
          : attempt.started_at
            ? format(new Date(attempt.started_at), 'dd/MM/yyyy HH:mm')
            : '-',
        status: attempt.submitted_at ? 'Realizado' : 'Não Realizado',
      })
    }

    return {
      institution: process.env.NEXT_PUBLIC_INSTITUTION_NAME || 'IPETEC / UCP',
      report_date: format(new Date(), 'dd/MM/yyyy'),
      grades: gradesData,
    }
  } catch (error) {
    console.error('Erro ao buscar dados de notas:', error)
    throw error
  }
}

/**
 * Processa dados para formato compatível com template
 */
export function mapGradesDataForTemplate(data: GradesReportData): Record<string, any> {
  return {
    institution: data.institution,
    report_date: data.report_date,
    grades: data.grades,
  }
}

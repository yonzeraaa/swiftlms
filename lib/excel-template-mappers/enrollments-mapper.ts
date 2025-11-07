import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import type { ArrayMapping, TemplateMetadata } from '../excel-template-engine'

export interface EnrollmentsReportData {
  institution: string
  period_start: string
  period_end: string
  enrollments: EnrollmentRowData[]
}

export interface EnrollmentRowData {
  student_name: string
  email: string
  course: string
  enrolled_at: string
  status: string
  progress_percentage: number
  lessons_completed: number
  lessons_total: number
  completed_at: string
  certificate_id: string
}

/**
 * Busca dados de matrículas do banco de dados
 */
export async function fetchEnrollmentsData(dateRange?: {
  start: string
  end: string
}): Promise<EnrollmentsReportData> {
  const supabase = createClient()

  // Definir período padrão se não fornecido
  const start = dateRange?.start || format(new Date(new Date().setDate(1)), 'yyyy-MM-dd')
  const end = dateRange?.end || format(new Date(), 'yyyy-MM-dd')

  try {
    // Buscar matrículas do período com joins
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        *,
        course:courses!inner(title),
        user:profiles!enrollments_user_id_fkey(full_name, email),
        certificates(id, certificate_number)
      `)
      .gte('enrolled_at', start)
      .lte('enrolled_at', end)
      .order('enrolled_at', { ascending: false })

    if (enrollmentsError) {
      throw new Error(`Erro ao buscar matrículas: ${enrollmentsError.message}`)
    }

    // Buscar progresso de lições para calcular % de conclusão
    const enrollmentIds = enrollments?.map((e: any) => e.id) || []

    const { data: lessonProgress } = await supabase
      .from('lesson_progress')
      .select('enrollment_id, is_completed')
      .in('enrollment_id', enrollmentIds)

    // Criar map de progresso por enrollment
    const progressMap = new Map<string, { completed: number; total: number }>()

    lessonProgress?.forEach((lp: any) => {
      const current = progressMap.get(lp.enrollment_id) || { completed: 0, total: 0 }
      current.total++
      if (lp.is_completed) {
        current.completed++
      }
      progressMap.set(lp.enrollment_id, current)
    })

    // Processar dados das matrículas
    const enrollmentsData: EnrollmentRowData[] = []

    for (const enrollment of enrollments || []) {
      const progress = progressMap.get(enrollment.id) || { completed: 0, total: 0 }
      const progressPercentage =
        progress.total > 0 ? (progress.completed / progress.total) * 100 : 0

      // Traduzir status
      let statusText = 'Ativo'
      if (enrollment.status === 'completed') {
        statusText = 'Concluído'
      } else if (enrollment.status === 'dropped') {
        statusText = 'Evadido'
      } else if (enrollment.status === 'cancelled') {
        statusText = 'Cancelado'
      }

      enrollmentsData.push({
        student_name: enrollment.user?.full_name || 'Aluno desconhecido',
        email: enrollment.user?.email || '',
        course: enrollment.course?.title || 'Curso não especificado',
        enrolled_at: enrollment.enrolled_at
          ? format(new Date(enrollment.enrolled_at), 'dd/MM/yyyy')
          : '',
        status: statusText,
        progress_percentage: Math.round(progressPercentage * 10) / 10,
        lessons_completed: progress.completed,
        lessons_total: progress.total,
        completed_at: enrollment.completed_at
          ? format(new Date(enrollment.completed_at), 'dd/MM/yyyy')
          : '-',
        certificate_id: enrollment.certificates?.[0]?.certificate_number || '-',
      })
    }

    return {
      institution: process.env.NEXT_PUBLIC_INSTITUTION_NAME || 'IPETEC / UCP',
      period_start: format(new Date(start), 'dd/MM/yyyy'),
      period_end: format(new Date(end), 'dd/MM/yyyy'),
      enrollments: enrollmentsData,
    }
  } catch (error) {
    console.error('Erro ao buscar dados de matrículas:', error)
    throw error
  }
}

/**
 * Processa dados para formato compatível com template
 */
export function mapEnrollmentsDataForTemplate(
  data: EnrollmentsReportData
): Record<string, any> {
  return {
    institution: data.institution,
    period_start: data.period_start,
    period_end: data.period_end,
    enrollments: data.enrollments,
  }
}

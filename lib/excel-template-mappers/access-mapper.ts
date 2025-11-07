import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import type { ArrayMapping, TemplateMetadata } from '../excel-template-engine'

export interface AccessReportData {
  institution: string
  report_date: string
  access_stats: AccessStatsRowData[]
}

export interface AccessStatsRowData {
  student_name: string
  email: string
  courses_count: number
  last_access: string
  total_accesses: number
  total_hours: number
  lessons_completed: number
  lessons_total: number
  completion_percentage: number
  status: string
}

/**
 * Busca dados de acesso dos alunos
 */
export async function fetchAccessData(): Promise<AccessReportData> {
  const supabase = createClient()

  try {
    // Buscar estudantes com suas matrículas e progresso (QUERY OTIMIZADA)
    const { data: students, error: studentsError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        enrollments!inner(
          id,
          status,
          course:courses(title)
        )
      `)
      .eq('role', 'student')
      .in('enrollments.status', ['active', 'completed'])
      .order('full_name')

    if (studentsError) {
      throw new Error(`Erro ao buscar estudantes: ${studentsError.message}`)
    }

    // Buscar todo o progresso de lições com agregação
    const studentIds = students?.map((s: any) => s.id) || []

    const { data: progressData } = await supabase
      .from('lesson_progress')
      .select('user_id, is_completed, last_accessed_at, time_spent')
      .in('user_id', studentIds)

    // Criar map de estatísticas por aluno
    const statsMap = new Map<
      string,
      {
        accesses: number
        totalHours: number
        completed: number
        total: number
        lastAccess: Date | null
      }
    >()

    progressData?.forEach((lp: any) => {
      const current = statsMap.get(lp.user_id) || {
        accesses: 0,
        totalHours: 0,
        completed: 0,
        total: 0,
        lastAccess: null,
      }

      current.total++
      current.accesses++

      // Tempo gasto (convertendo minutos para horas)
      if (lp.time_spent) {
        current.totalHours += lp.time_spent / 60
      }

      if (lp.is_completed) {
        current.completed++
      }

      // Último acesso
      if (lp.last_accessed_at) {
        const accessDate = new Date(lp.last_accessed_at)
        if (!current.lastAccess || accessDate > current.lastAccess) {
          current.lastAccess = accessDate
        }
      }

      statsMap.set(lp.user_id, current)
    })

    // Processar dados dos estudantes
    const accessStatsData: AccessStatsRowData[] = []

    for (const student of students || []) {
      const stats = statsMap.get(student.id) || {
        accesses: 0,
        totalHours: 0,
        completed: 0,
        total: 0,
        lastAccess: null,
      }

      const completionPercentage =
        stats.total > 0 ? (stats.completed / stats.total) * 100 : 0

      // Determinar status baseado em atividade
      let status = 'Inativo'
      if (stats.lastAccess) {
        const daysSinceAccess = Math.floor(
          (new Date().getTime() - stats.lastAccess.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysSinceAccess <= 7) {
          status = 'Ativo'
        } else if (daysSinceAccess <= 30) {
          status = 'Moderadamente Ativo'
        }
      }

      // Contar cursos únicos das matrículas
      const coursesCount = new Set(
        (student.enrollments || []).map((e: any) => e.course?.title)
      ).size

      accessStatsData.push({
        student_name: student.full_name || 'Aluno desconhecido',
        email: student.email || '',
        courses_count: coursesCount,
        last_access: stats.lastAccess
          ? format(stats.lastAccess, 'dd/MM/yyyy HH:mm')
          : 'Nunca acessou',
        total_accesses: stats.accesses,
        total_hours: Math.round(stats.totalHours * 10) / 10,
        lessons_completed: stats.completed,
        lessons_total: stats.total,
        completion_percentage: Math.round(completionPercentage * 10) / 10,
        status,
      })
    }

    return {
      institution: process.env.NEXT_PUBLIC_INSTITUTION_NAME || 'IPETEC / UCP',
      report_date: format(new Date(), 'dd/MM/yyyy'),
      access_stats: accessStatsData,
    }
  } catch (error) {
    console.error('Erro ao buscar dados de acesso:', error)
    throw error
  }
}

/**
 * Processa dados para formato compatível com template
 */
export function mapAccessDataForTemplate(data: AccessReportData): Record<string, any> {
  return {
    institution: data.institution,
    report_date: data.report_date,
    access_stats: data.access_stats,
  }
}

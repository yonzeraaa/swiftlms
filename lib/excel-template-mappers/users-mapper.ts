import { createClient } from '@/lib/supabase/server'
import { Translators, Calculators, Formatters, Helpers } from './shared-utils'
import type { ArrayMapping, TemplateMetadata } from '../excel-template-engine'

export interface UserReportData {
  institution: string
  users: UserRowData[]
}

export interface UserRowData {
  full_name: string
  email: string
  phone: string
  course_code: string
  role: string
  grade: number
  progress: number
  enrollment_date: string
  completed_at: string
  time_in_system: number
  status: string
}

/**
 * Busca dados de usuários do banco de dados
 */
export async function fetchUsersData(): Promise<UserReportData> {
  const supabase = await createClient()

  try {
    // Buscar todos os usuários com suas matrículas e progresso
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        *,
        enrollments(
          *,
          course:courses(title, slug),
          lesson_progress(*)
        )
      `)
      .order('full_name', { ascending: true })

    if (usersError) {
      throw new Error(`Erro ao buscar usuários: ${usersError.message}`)
    }

    // Processar dados dos usuários
    const usersData: UserRowData[] = []

    for (const user of users || []) {
      // Se não tem matrículas, criar linha sem curso
      if (!user.enrollments || user.enrollments.length === 0) {
        usersData.push({
          full_name: Helpers.defaultValue(user.full_name, 'Usuário desconhecido'),
          email: user.email || '',
          phone: user.phone || '',
          course_code: '-',
          role: Translators.role(user.role),
          grade: 0,
          progress: 0,
          enrollment_date: '',
          completed_at: '',
          time_in_system: 0,
          status: Translators.userStatus(user.status),
        })
        continue
      }

      // Para cada matrícula, criar uma linha
      for (const enrollment of user.enrollments as any[]) {
        const lessons = enrollment.lesson_progress || []
        const avanco = Calculators.lessonProgress(lessons)

        // Calcular pontuação (média dos testes - placeholder)
        const pontuacao = enrollment.progress_percentage || 0

        // Calcular tempo no sistema
        const enrolledDate = enrollment.enrolled_at
          ? new Date(enrollment.enrolled_at)
          : new Date()
        const diffHours = Calculators.hoursBetween(enrolledDate, new Date())

        // Determinar situação
        const situacao = Translators.enrollmentStatus(enrollment.status, user.status)

        usersData.push({
          full_name: Helpers.defaultValue(user.full_name, 'Usuário desconhecido'),
          email: user.email || '',
          phone: user.phone || '',
          course_code: enrollment.course?.slug || '-',
          role: Translators.role(user.role),
          grade: Formatters.number(pontuacao),
          progress: Formatters.number(avanco),
          enrollment_date: Formatters.date(enrollment.enrolled_at),
          completed_at: Formatters.date(enrollment.completed_at) || '-',
          time_in_system: diffHours,
          status: situacao,
        })
      }
    }

    return {
      institution: Formatters.institution(),
      users: usersData,
    }
  } catch (error) {
    console.error('Erro ao buscar dados de usuários:', error)
    throw error
  }
}

// Função deprecated removida - mapeamentos agora são configurados via UI

/**
 * Processa dados para formato compatível com template
 */
export function mapUsersDataForTemplate(data: UserReportData): Record<string, any> {
  return {
    institution: data.institution,
    users: data.users,
  }
}

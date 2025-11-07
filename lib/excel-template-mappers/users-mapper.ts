import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
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
  const supabase = createClient()

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
          full_name: user.full_name || 'Usuário desconhecido',
          email: user.email || '',
          phone: user.phone || '',
          course_code: '-',
          role:
            user.role === 'admin'
              ? 'Administrador'
              : user.role === 'instructor'
                ? 'Professor'
                : 'Estudante',
          grade: 0,
          progress: 0,
          enrollment_date: '',
          completed_at: '',
          time_in_system: 0,
          status: user.status === 'inactive' ? 'Inativo' : 'Ativo',
        })
        continue
      }

      // Para cada matrícula, criar uma linha
      for (const enrollment of user.enrollments as any[]) {
        const lessons = enrollment.lesson_progress || []
        const completedLessons = lessons.filter((lp: any) => lp.is_completed).length
        const totalLessons = lessons.length
        const avanco = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

        // Calcular pontuação (média dos testes - placeholder)
        const pontuacao = enrollment.progress_percentage || 0

        // Calcular tempo no sistema (placeholder - usar activity_logs depois)
        const enrolledDate = enrollment.enrolled_at
          ? new Date(enrollment.enrolled_at)
          : new Date()
        const now = new Date()
        const diffTime = Math.abs(now.getTime() - enrolledDate.getTime())
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60))

        // Determinar situação
        let situacao = 'Ativo'
        if (enrollment.status === 'completed') {
          situacao = 'Concluído'
        } else if (enrollment.status === 'dropped') {
          situacao = 'Evadido'
        } else if (user.status === 'inactive') {
          situacao = 'Inativo'
        }

        usersData.push({
          full_name: user.full_name || 'Usuário desconhecido',
          email: user.email || '',
          phone: user.phone || '',
          course_code: enrollment.course?.slug || '-',
          role:
            user.role === 'admin'
              ? 'Administrador'
              : user.role === 'instructor'
                ? 'Professor'
                : 'Estudante',
          grade: Math.round(pontuacao * 10) / 10,
          progress: Math.round(avanco * 10) / 10,
          enrollment_date: enrollment.enrolled_at
            ? format(new Date(enrollment.enrolled_at), 'dd/MM/yyyy')
            : '',
          completed_at: enrollment.completed_at
            ? format(new Date(enrollment.completed_at), 'dd/MM/yyyy')
            : '-',
          time_in_system: diffHours,
          status: situacao,
        })
      }
    }

    return {
      institution: 'IPETEC / UCP',
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

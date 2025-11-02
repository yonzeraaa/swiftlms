import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import type { ArrayMapping, TemplateMetadata } from '../excel-template-engine'

export interface UserReportData {
  institution: string
  users: UserRowData[]
}

export interface UserRowData {
  nome_completo: string
  email: string
  whatsapp: string
  codigo_curso: string
  atividade: string
  pontuacao: number
  avanco: number
  data_matricula: string
  data_conclusao: string
  tempo_sistema: number
  situacao: string
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
          nome_completo: user.full_name || 'Usuário desconhecido',
          email: user.email || '',
          whatsapp: user.phone || '',
          codigo_curso: '-',
          atividade:
            user.role === 'admin'
              ? 'Administrador'
              : user.role === 'instructor'
                ? 'Professor'
                : 'Estudante',
          pontuacao: 0,
          avanco: 0,
          data_matricula: '',
          data_conclusao: '',
          tempo_sistema: 0,
          situacao: user.status === 'inactive' ? 'Inativo' : 'Ativo',
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
          nome_completo: user.full_name || 'Usuário desconhecido',
          email: user.email || '',
          whatsapp: user.phone || '',
          codigo_curso: enrollment.course?.slug || '-',
          atividade:
            user.role === 'admin'
              ? 'Administrador'
              : user.role === 'instructor'
                ? 'Professor'
                : 'Estudante',
          pontuacao: Math.round(pontuacao * 10) / 10,
          avanco: Math.round(avanco * 10) / 10,
          data_matricula: enrollment.enrolled_at
            ? format(new Date(enrollment.enrolled_at), 'dd/MM/yyyy')
            : '',
          data_conclusao: enrollment.completed_at
            ? format(new Date(enrollment.completed_at), 'dd/MM/yyyy')
            : '-',
          tempo_sistema: diffHours,
          situacao,
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

/**
 * Cria metadados de mapeamento para o template de usuários
 * Define onde cada campo deve ser inserido no Excel
 */
export function createUsersMappingMetadata(): TemplateMetadata {
  return {
    mappings: {
      // Célula única - instituição
      B3: 'institution',

      // Mapeamento de array - dados dos usuários
      users_table: {
        type: 'array',
        source: 'users',
        startRow: 5, // Linha onde começa a tabela (após cabeçalho)
        fields: {
          nome_completo: 1, // Coluna A
          email: 2, // Coluna B
          whatsapp: 3, // Coluna C
          codigo_curso: 4, // Coluna D
          atividade: 5, // Coluna E
          pontuacao: 6, // Coluna F
          avanco: 7, // Coluna G
          data_matricula: 8, // Coluna H
          data_conclusao: 9, // Coluna I
          tempo_sistema: 10, // Coluna J
          situacao: 11, // Coluna K
        },
      } as ArrayMapping,
    },
  }
}

/**
 * Processa dados para formato compatível com template
 */
export function mapUsersDataForTemplate(data: UserReportData): Record<string, any> {
  return {
    institution: data.institution,
    users: data.users,
  }
}

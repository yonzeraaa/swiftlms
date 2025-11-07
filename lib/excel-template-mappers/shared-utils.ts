import { format } from 'date-fns'

/**
 * Funções utilitárias compartilhadas entre mappers
 */

// ============ TRADUTORES ============

export const Translators = {
  /**
   * Traduz role de usuário para português
   */
  role: (role: string): string => {
    const roleMap: Record<string, string> = {
      admin: 'Administrador',
      instructor: 'Professor',
      student: 'Estudante',
    }
    return roleMap[role] || 'Estudante'
  },

  /**
   * Traduz status de usuário para português
   */
  userStatus: (status: string): string => {
    const statusMap: Record<string, string> = {
      active: 'Ativo',
      inactive: 'Inativo',
      suspended: 'Suspenso',
    }
    return statusMap[status] || 'Desconhecido'
  },

  /**
   * Traduz status de matrícula para português
   */
  enrollmentStatus: (status: string, userStatus?: string): string => {
    if (status === 'completed') {
      return 'Concluído'
    } else if (status === 'dropped') {
      return 'Evadido'
    } else if (status === 'cancelled') {
      return 'Cancelado'
    } else if (userStatus === 'inactive') {
      return 'Inativo'
    }
    return 'Ativo'
  },

  /**
   * Traduz status de teste para português
   */
  testStatus: (submitted: boolean): string => {
    return submitted ? 'Realizado' : 'Não Realizado'
  },
}

// ============ CALCULADORAS ============

export const Calculators = {
  /**
   * Calcula porcentagem de progresso
   */
  progress: (completed: number, total: number): number => {
    if (total === 0) return 0
    return Math.round((completed / total) * 100 * 10) / 10
  },

  /**
   * Calcula porcentagem de progresso de lições
   */
  lessonProgress: (lessons: any[]): number => {
    const completedLessons = lessons.filter((lp: any) => lp.is_completed).length
    const totalLessons = lessons.length
    return Calculators.progress(completedLessons, totalLessons)
  },

  /**
   * Calcula média geral ponderada (testes + TCC)
   * Fórmula: (testes × 1 + TCC × 2) / 3
   */
  generalAverage: (testAvg: number, tccScore: number): number => {
    return Math.round(((testAvg * 1 + tccScore * 2) / 3) * 10) / 10
  },

  /**
   * Calcula tempo decorrido em horas entre duas datas
   */
  hoursBetween: (startDate: Date, endDate: Date): number => {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    return Math.floor(diffTime / (1000 * 60 * 60))
  },

  /**
   * Calcula média de um array de números
   */
  average: (numbers: number[]): number => {
    if (numbers.length === 0) return 0
    const sum = numbers.reduce((a, b) => a + b, 0)
    return Math.round((sum / numbers.length) * 10) / 10
  },

  /**
   * Determina aprovação baseado em média
   */
  isApproved: (average: number, threshold: number = 70): boolean => {
    return average >= threshold
  },
}

// ============ FORMATADORES ============

export const Formatters = {
  /**
   * Formata data no padrão brasileiro (dd/MM/yyyy)
   */
  date: (date: string | Date | null): string => {
    if (!date) return '-'
    try {
      return format(new Date(date), 'dd/MM/yyyy')
    } catch {
      return '-'
    }
  },

  /**
   * Formata data e hora no padrão brasileiro (dd/MM/yyyy HH:mm)
   */
  datetime: (date: string | Date | null): string => {
    if (!date) return '-'
    try {
      return format(new Date(date), 'dd/MM/yyyy HH:mm')
    } catch {
      return '-'
    }
  },

  /**
   * Formata número com 1 casa decimal
   */
  number: (value: number): number => {
    return Math.round(value * 10) / 10
  },

  /**
   * Formata nome de instituição (usa env var ou fallback)
   */
  institution: (): string => {
    return process.env.NEXT_PUBLIC_INSTITUTION_NAME || 'IPETEC / UCP'
  },

  /**
   * Formata código de módulo (CMN01, CMN02, etc)
   */
  moduleCode: (index: number): string => {
    return `CMN${(index + 1).toString().padStart(2, '0')}`
  },

  /**
   * Formata código de disciplina (CMN0101, CMN0102, etc)
   */
  lessonCode: (moduleIndex: number, lessonIndex: number): string => {
    return `CMN${(moduleIndex + 1).toString().padStart(2, '0')}${(
      lessonIndex + 1
    )
      .toString()
      .padStart(2, '0')}`
  },
}

// ============ VALIDADORES ============

export const Validators = {
  /**
   * Valida se é um UUID válido
   */
  isUUID: (value: string): boolean => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(value)
  },

  /**
   * Valida se é um email válido
   */
  isEmail: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  },

  /**
   * Valida se a data final é maior ou igual à data inicial
   */
  isValidDateRange: (start: string, end: string): boolean => {
    return new Date(end) >= new Date(start)
  },
}

// ============ HELPERS ============

export const Helpers = {
  /**
   * Retorna valor padrão se o valor for null/undefined/vazio
   */
  defaultValue: <T>(value: T | null | undefined, defaultVal: T): T => {
    return value ?? defaultVal
  },

  /**
   * Converte minutos em horas arredondadas
   */
  minutesToHours: (minutes: number): number => {
    return Math.round(minutes / 60)
  },

  /**
   * Cria um Map a partir de um array para lookup rápido
   */
  createLookupMap: <T extends { id: string }>(
    items: T[],
    keyField: keyof T = 'id'
  ): Map<string, T> => {
    return new Map(items.map((item) => [item[keyField] as string, item]))
  },

  /**
   * Remove duplicatas de um array baseado em uma chave
   */
  unique: <T>(array: T[], key: keyof T): T[] => {
    const seen = new Set()
    return array.filter((item) => {
      const k = item[key]
      if (seen.has(k)) {
        return false
      }
      seen.add(k)
      return true
    })
  },
}

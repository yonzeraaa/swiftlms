export interface Enrollment {
  id: string
  student_id: string
  course_id: string
  progress: number
  status: 'active' | 'completed' | 'dropped'
  enrolled_at: string
  completed_at?: string | null
}

export interface Course {
  id: string
  title: string
  status: 'active' | 'inactive' | 'draft'
}

export interface Module {
  id: string
  course_id: string
  order: number
  is_completed?: boolean
}

export class EnrollmentService {
  canEnroll(student_id: string, course: Course, existingEnrollment?: Enrollment): boolean {
    // Verifica se já está matriculado
    if (existingEnrollment && existingEnrollment.status === 'active') {
      return false
    }

    // Verifica se o curso está ativo
    if (course.status !== 'active') {
      return false
    }

    return true
  }

  calculateProgress(completedModules: number, totalModules: number): number {
    if (totalModules === 0) {
      return 0
    }

    return Math.round((completedModules / totalModules) * 100)
  }

  getEnrollmentStatus(enrollment: Enrollment): 'active' | 'completed' | 'failed' {
    if (enrollment.status === 'completed' && enrollment.progress === 100) {
      return 'completed'
    }

    if (enrollment.status === 'dropped') {
      return 'failed'
    }

    return 'active'
  }

  getNextModuleToComplete(modules: Module[]): Module | null {
    // Ordena por order e encontra o primeiro não concluído
    const sortedModules = [...modules].sort((a, b) => a.order - b.order)
    const nextModule = sortedModules.find(m => !m.is_completed)

    return nextModule || null
  }

  shouldCompleteEnrollment(progress: number, passingGrade?: number): boolean {
    if (progress !== 100) {
      return false
    }

    // Se passing grade não fornecido, considera que passou
    if (passingGrade === undefined) {
      return true
    }

    return passingGrade >= 7.0
  }

  validateEnrollment(student_id: string, course_id: string): { valid: boolean; error?: string } {
    if (!student_id || !course_id) {
      return {
        valid: false,
        error: 'student_id e course_id são obrigatórios',
      }
    }

    return { valid: true }
  }
}

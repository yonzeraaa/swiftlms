export interface Enrollment {
  id: string
  student_id: string
  course_id: string
  progress: number
  status: 'active' | 'completed' | 'dropped'
  completed_at?: string | null
}

export interface Course {
  id: string
  title: string
  duration_hours?: number
}

export interface CertificateRequest {
  id: string
  enrollment_id: string
  student_id: string
  course_id: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  approved_at?: string | null
  approved_by?: string | null
}

export class CertificateService {
  canRequestCertificate(enrollment: Enrollment): boolean {
    // Deve estar 100% completo
    if (enrollment.progress !== 100) {
      return false
    }

    // Deve estar com status completed
    if (enrollment.status !== 'completed') {
      return false
    }

    return true
  }

  generateCertificateData(
    enrollment: Enrollment,
    course: Course,
    studentName: string
  ): {
    studentName: string
    courseName: string
    completionDate: string
    courseHours: string
  } {
    return {
      studentName,
      courseName: course.title,
      completionDate: this.formatCompletionDate(enrollment.completed_at || new Date().toISOString()),
      courseHours: this.formatCourseHours(course.duration_hours || 0),
    }
  }

  formatCompletionDate(isoDate: string): string {
    const date = new Date(isoDate)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  formatCourseHours(hours: number): string {
    return `${hours} hora${hours !== 1 ? 's' : ''}`
  }

  getCertificateStatus(request: CertificateRequest): 'approved' | 'pending' | 'rejected' {
    return request.status
  }

  validateCertificateRequest(enrollment: Enrollment): { valid: boolean; error?: string } {
    if (!this.canRequestCertificate(enrollment)) {
      if (enrollment.progress < 100) {
        return {
          valid: false,
          error: `Curso não concluído. Progresso atual: ${enrollment.progress}%`,
        }
      }
      if (enrollment.status !== 'completed') {
        return {
          valid: false,
          error: `Status do enrollment não é "completed": ${enrollment.status}`,
        }
      }
    }

    return { valid: true }
  }
}

export interface StudentEnrollment {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
  progress_percentage: number
  status: 'active' | 'completed' | 'dropped'
}

export interface CourseModule {
  id: string
  title: string
  total_hours?: number
  order: number
}

export interface Lesson {
  id: string
  title: string
  duration_minutes?: number
  module_id: string
}

export interface LessonProgress {
  id: string
  lesson_id: string
  user_id: string
  score?: number
  completed_at?: string
  updated_at: string
}

export interface TestAttempt {
  id: string
  user_id: string
  test_id: string
  score: number
  submitted_at: string
}

export interface TCCSubmission {
  id: string
  user_id: string
  grade?: number
  evaluated_at?: string
}

export interface StudentHistorySummary {
  student_name: string
  course_name: string
  enrolled_at: string
  status: string
  progress_percentage: number
  tests_average: number
  tcc_grade: number
  general_average: number
  total_workload: number
  completed_lessons: number
  total_lessons: number
  is_approved: boolean
}

export interface ModuleProgress {
  module_id: string
  module_name: string
  workload: number
  completed_lessons: number
  total_lessons: number
  average_score: number
}

export class StudentHistoryService {
  /**
   * Calcula média dos testes
   */
  calculateTestsAverage(testAttempts: TestAttempt[]): number {
    if (!testAttempts || testAttempts.length === 0) {
      return 0
    }

    const validScores = testAttempts.filter(ta => ta.score > 0).map(ta => ta.score)

    if (validScores.length === 0) {
      return 0
    }

    const sum = validScores.reduce((acc, score) => acc + score, 0)
    return Math.round((sum / validScores.length) * 10) / 10
  }

  /**
   * Calcula média geral ponderada (70% testes + 30% TCC)
   */
  calculateGeneralAverage(testsAverage: number, tccGrade: number): number {
    const average = testsAverage * 0.7 + tccGrade * 0.3
    return Math.round(average * 10) / 10
  }

  /**
   * Verifica se o aluno está aprovado (média >= 7.0)
   */
  isApproved(generalAverage: number, passingGrade: number = 7.0): boolean {
    return generalAverage >= passingGrade
  }

  /**
   * Calcula progresso do módulo
   */
  calculateModuleProgress(
    module: CourseModule,
    lessons: Lesson[],
    lessonProgress: LessonProgress[]
  ): ModuleProgress {
    const moduleLessons = lessons.filter(l => l.module_id === module.id)
    const progressMap = new Map(lessonProgress.map(p => [p.lesson_id, p]))

    const completedLessons = moduleLessons.filter(
      lesson => progressMap.get(lesson.id)?.completed_at
    ).length

    const scores = moduleLessons
      .map(lesson => progressMap.get(lesson.id)?.score)
      .filter((score): score is number => typeof score === 'number' && score > 0)

    const averageScore =
      scores.length > 0 ? scores.reduce((acc, s) => acc + s, 0) / scores.length : 0

    return {
      module_id: module.id,
      module_name: module.title,
      workload: module.total_hours || 0,
      completed_lessons: completedLessons,
      total_lessons: moduleLessons.length,
      average_score: Math.round(averageScore * 10) / 10,
    }
  }

  /**
   * Calcula carga horária total do curso
   */
  calculateTotalWorkload(modules: CourseModule[], lessons: Lesson[]): number {
    const moduleHours = modules.reduce((acc, m) => acc + (m.total_hours || 0), 0)

    const lessonHours = lessons.reduce((acc, l) => {
      const hours = (l.duration_minutes || 0) / 60
      return acc + hours
    }, 0)

    return Math.round((moduleHours + lessonHours) * 10) / 10
  }

  /**
   * Conta lições completas
   */
  countCompletedLessons(lessons: Lesson[], lessonProgress: LessonProgress[]): number {
    const progressMap = new Map(lessonProgress.map(p => [p.lesson_id, p]))

    return lessons.filter(lesson => progressMap.get(lesson.id)?.completed_at).length
  }

  /**
   * Formata status do enrollment
   */
  formatEnrollmentStatus(status: StudentEnrollment['status']): string {
    const statusMap = {
      active: 'Em andamento',
      completed: 'Concluído',
      dropped: 'Cancelado',
    }

    return statusMap[status] || status
  }

  /**
   * Gera sumário do histórico do estudante
   */
  generateHistorySummary(
    studentName: string,
    courseName: string,
    enrollment: StudentEnrollment,
    modules: CourseModule[],
    lessons: Lesson[],
    lessonProgress: LessonProgress[],
    testAttempts: TestAttempt[],
    tccSubmission?: TCCSubmission
  ): StudentHistorySummary {
    const testsAverage = this.calculateTestsAverage(testAttempts)
    const tccGrade = tccSubmission?.grade || 0
    const generalAverage = this.calculateGeneralAverage(testsAverage, tccGrade)
    const totalWorkload = this.calculateTotalWorkload(modules, lessons)
    const completedLessons = this.countCompletedLessons(lessons, lessonProgress)

    return {
      student_name: studentName,
      course_name: courseName,
      enrolled_at: enrollment.enrolled_at,
      status: this.formatEnrollmentStatus(enrollment.status),
      progress_percentage: enrollment.progress_percentage,
      tests_average: testsAverage,
      tcc_grade: tccGrade,
      general_average: generalAverage,
      total_workload: totalWorkload,
      completed_lessons: completedLessons,
      total_lessons: lessons.length,
      is_approved: this.isApproved(generalAverage),
    }
  }

  /**
   * Valida se os dados do histórico são consistentes
   */
  validateHistoryData(enrollment: StudentEnrollment): { valid: boolean; error?: string } {
    if (!enrollment.user_id || !enrollment.course_id) {
      return {
        valid: false,
        error: 'Dados de matrícula incompletos (user_id ou course_id ausentes)',
      }
    }

    if (!enrollment.enrolled_at) {
      return {
        valid: false,
        error: 'Data de matrícula ausente',
      }
    }

    if (enrollment.progress_percentage < 0 || enrollment.progress_percentage > 100) {
      return {
        valid: false,
        error: `Porcentagem de progresso inválida: ${enrollment.progress_percentage}%`,
      }
    }

    return { valid: true }
  }

  /**
   * Formata nota para exibição (1 casa decimal, vírgula como separador)
   */
  formatGrade(grade: number): string {
    return grade.toFixed(1).replace('.', ',')
  }

  /**
   * Obtém o progresso mais recente de uma lição
   */
  getLatestLessonProgress(
    lessonId: string,
    allProgress: LessonProgress[]
  ): LessonProgress | null {
    const lessonProgressList = allProgress.filter(p => p.lesson_id === lessonId)

    if (lessonProgressList.length === 0) {
      return null
    }

    return lessonProgressList.reduce((latest, current) => {
      const latestDate = new Date(latest.updated_at)
      const currentDate = new Date(current.updated_at)
      return currentDate > latestDate ? current : latest
    })
  }

  /**
   * Calcula dias decorridos entre duas datas
   */
  calculateDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Obtém a tentativa de teste mais recente
   */
  getLatestTestAttempt(testId: string, attempts: TestAttempt[]): TestAttempt | null {
    const testAttempts = attempts.filter(a => a.test_id === testId)

    if (testAttempts.length === 0) {
      return null
    }

    return testAttempts.reduce((latest, current) => {
      const latestDate = new Date(latest.submitted_at)
      const currentDate = new Date(current.submitted_at)
      return currentDate > latestDate ? current : latest
    })
  }
}

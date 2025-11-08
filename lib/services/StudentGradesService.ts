export interface TestGrade {
  id: string
  user_id: string
  test_id: string
  course_id: string
  subject_id?: string
  best_score: number
  total_attempts: number
  last_attempt_date: string
}

export interface GradeOverride {
  id: string
  user_id: string
  test_id: string
  original_score: number
  override_score: number
  reason: string
  overridden_by: string
  overridden_at: string
}

export interface StudentGradeSummary {
  user_id: string
  course_id: string
  total_tests: number
  completed_tests: number
  average_score: number
  passing_grade: number
  passed_tests: number
  failed_tests: number
  is_passing: boolean
  best_score: number
  worst_score: number
}

export interface GradeStatistics {
  mean: number
  median: number
  mode: number
  min: number
  max: number
  std_deviation: number
}

export class StudentGradesService {
  /**
   * Calcula média de notas
   */
  calculateAverage(grades: TestGrade[]): number {
    if (grades.length === 0) {
      return 0
    }

    const sum = grades.reduce((acc, grade) => acc + grade.best_score, 0)
    return Math.round((sum / grades.length) * 10) / 10
  }

  /**
   * Conta testes aprovados
   */
  countPassedTests(grades: TestGrade[], passingGrade: number = 70): number {
    return grades.filter(grade => grade.best_score >= passingGrade).length
  }

  /**
   * Verifica se estudante está aprovado no curso (média >= passing grade)
   */
  isPassingCourse(grades: TestGrade[], passingGrade: number = 70): boolean {
    if (grades.length === 0) {
      return false
    }

    const average = this.calculateAverage(grades)
    return average >= passingGrade
  }

  /**
   * Gera sumário de notas do estudante
   */
  generateGradeSummary(
    userId: string,
    courseId: string,
    grades: TestGrade[],
    totalTests: number,
    passingGrade: number = 70
  ): StudentGradeSummary {
    const completedTests = grades.length
    const average = this.calculateAverage(grades)
    const passedTests = this.countPassedTests(grades, passingGrade)
    const failedTests = completedTests - passedTests

    const scores = grades.map(g => g.best_score)
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0
    const worstScore = scores.length > 0 ? Math.min(...scores) : 0

    return {
      user_id: userId,
      course_id: courseId,
      total_tests: totalTests,
      completed_tests: completedTests,
      average_score: average,
      passing_grade: passingGrade,
      passed_tests: passedTests,
      failed_tests: failedTests,
      is_passing: this.isPassingCourse(grades, passingGrade),
      best_score: bestScore,
      worst_score: worstScore,
    }
  }

  /**
   * Valida parâmetros de override de nota
   */
  validateGradeOverride(
    originalScore: number,
    overrideScore: number,
    reason: string
  ): { valid: boolean; error?: string } {
    if (originalScore < 0 || originalScore > 100) {
      return { valid: false, error: 'Nota original inválida (deve ser entre 0 e 100)' }
    }

    if (overrideScore < 0 || overrideScore > 100) {
      return { valid: false, error: 'Nota de override inválida (deve ser entre 0 e 100)' }
    }

    if (originalScore === overrideScore) {
      return {
        valid: false,
        error: 'Nota de override deve ser diferente da nota original',
      }
    }

    if (!reason || reason.trim() === '') {
      return { valid: false, error: 'Motivo do override é obrigatório' }
    }

    if (reason.length < 10) {
      return { valid: false, error: 'Motivo deve ter pelo menos 10 caracteres' }
    }

    return { valid: true }
  }

  /**
   * Calcula estatísticas das notas
   */
  calculateStatistics(grades: TestGrade[]): GradeStatistics | null {
    if (grades.length === 0) {
      return null
    }

    const scores = grades.map(g => g.best_score).sort((a, b) => a - b)
    const n = scores.length

    // Mean
    const mean = Math.round((scores.reduce((a, b) => a + b, 0) / n) * 10) / 10

    // Median
    const median = n % 2 === 0 ? (scores[n / 2 - 1] + scores[n / 2]) / 2 : scores[Math.floor(n / 2)]

    // Mode (most frequent score)
    const frequency: Record<number, number> = {}
    scores.forEach(score => {
      frequency[score] = (frequency[score] || 0) + 1
    })
    const maxFreq = Math.max(...Object.values(frequency))
    const mode = Number(
      Object.keys(frequency).find(key => frequency[Number(key)] === maxFreq) || 0
    )

    // Min and Max
    const min = scores[0]
    const max = scores[n - 1]

    // Standard Deviation
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / n
    const std_deviation = Math.round(Math.sqrt(variance) * 10) / 10

    return {
      mean,
      median: Math.round(median * 10) / 10,
      mode,
      min,
      max,
      std_deviation,
    }
  }

  /**
   * Obtém melhor nota do estudante
   */
  getBestGrade(grades: TestGrade[]): TestGrade | null {
    if (grades.length === 0) {
      return null
    }

    return grades.reduce((best, current) =>
      current.best_score > best.best_score ? current : best
    )
  }

  /**
   * Obtém pior nota do estudante
   */
  getWorstGrade(grades: TestGrade[]): TestGrade | null {
    if (grades.length === 0) {
      return null
    }

    return grades.reduce((worst, current) =>
      current.best_score < worst.best_score ? current : worst
    )
  }

  /**
   * Filtra notas por curso
   */
  filterByCourse(grades: TestGrade[], courseId: string): TestGrade[] {
    return grades.filter(grade => grade.course_id === courseId)
  }

  /**
   * Filtra notas por disciplina
   */
  filterBySubject(grades: TestGrade[], subjectId: string): TestGrade[] {
    return grades.filter(grade => grade.subject_id === subjectId)
  }

  /**
   * Filtra notas aprovadas
   */
  filterPassingGrades(grades: TestGrade[], passingGrade: number = 70): TestGrade[] {
    return grades.filter(grade => grade.best_score >= passingGrade)
  }

  /**
   * Filtra notas reprovadas
   */
  filterFailingGrades(grades: TestGrade[], passingGrade: number = 70): TestGrade[] {
    return grades.filter(grade => grade.best_score < passingGrade)
  }

  /**
   * Ordena notas por score (decrescente)
   */
  sortByScore(grades: TestGrade[], ascending: boolean = false): TestGrade[] {
    return [...grades].sort((a, b) =>
      ascending ? a.best_score - b.best_score : b.best_score - a.best_score
    )
  }

  /**
   * Ordena notas por data (mais recente primeiro)
   */
  sortByDate(grades: TestGrade[], ascending: boolean = false): TestGrade[] {
    return [...grades].sort((a, b) => {
      const dateA = new Date(a.last_attempt_date).getTime()
      const dateB = new Date(b.last_attempt_date).getTime()
      return ascending ? dateA - dateB : dateB - dateA
    })
  }

  /**
   * Calcula percentual de conclusão
   */
  calculateCompletionPercentage(completedTests: number, totalTests: number): number {
    if (totalTests === 0) {
      return 0
    }

    return Math.round((completedTests / totalTests) * 100)
  }

  /**
   * Verifica se nota foi melhorada após override
   */
  isImprovedByOverride(override: GradeOverride): boolean {
    return override.override_score > override.original_score
  }

  /**
   * Calcula diferença entre override e nota original
   */
  calculateOverrideDifference(override: GradeOverride): number {
    return Math.round((override.override_score - override.original_score) * 10) / 10
  }

  /**
   * Formata nota para exibição
   */
  formatScore(score: number): string {
    return score.toFixed(1).replace('.', ',')
  }

  /**
   * Determina status da nota (Excelente, Bom, Regular, Insuficiente)
   */
  getScoreStatus(
    score: number,
    passingGrade: number = 70
  ): 'Excelente' | 'Bom' | 'Regular' | 'Insuficiente' {
    if (score >= 90) return 'Excelente'
    if (score >= passingGrade) return 'Bom'
    if (score >= 50) return 'Regular'
    return 'Insuficiente'
  }

  /**
   * Calcula nota necessária para aprovação
   */
  calculateRequiredScore(
    currentGrades: TestGrade[],
    totalTests: number,
    passingGrade: number = 70
  ): number | null {
    if (currentGrades.length >= totalTests) {
      return null // Todos os testes já foram realizados
    }

    const currentSum = currentGrades.reduce((sum, grade) => sum + grade.best_score, 0)
    const remainingTests = totalTests - currentGrades.length
    const requiredTotal = passingGrade * totalTests
    const requiredSum = requiredTotal - currentSum

    const requiredAverage = requiredSum / remainingTests

    if (requiredAverage > 100) {
      return null // Impossível atingir passing grade
    }

    return Math.max(0, Math.ceil(requiredAverage * 10) / 10)
  }

  /**
   * Verifica se ainda é possível passar no curso
   */
  canStillPass(
    currentGrades: TestGrade[],
    totalTests: number,
    passingGrade: number = 70
  ): boolean {
    const required = this.calculateRequiredScore(currentGrades, totalTests, passingGrade)
    return required !== null && required <= 100
  }
}

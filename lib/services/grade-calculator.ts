/**
 * Serviço centralizado para cálculos de notas
 *
 * Este módulo contém toda a lógica de cálculo de médias, notas ponderadas
 * e critérios de aprovação, garantindo consistência em todo o sistema.
 */

export interface GradeOverride {
  testsAverageOverride?: number | null
  testsWeight?: number
  tccGradeOverride?: number | null
  tccWeight?: number
}

export interface GradeMetrics {
  testsAverageEffective: number
  testsAverageRaw: number
  testsWeight: number
  tccGradeEffective: number
  tccGradeRaw: number | null
  tccWeight: number
  finalAverage: number
  denominator: number
}

export interface TestAttempt {
  test_id: string
  score: number
  submitted_at: string | null
}

export class GradeCalculator {
  /**
   * Calcula média de testes considerando apenas testes realizados (com score > 0)
   *
   * IMPORTANTE: Esta função calcula a média apenas dos testes REALIZADOS,
   * não penalizando alunos por testes não feitos.
   *
   * @param attempts - Array de tentativas de testes
   * @returns Média dos testes realizados (0 se nenhum teste foi feito)
   *
   * @example
   * ```ts
   * const attempts = [
   *   { test_id: '1', score: 80, submitted_at: '2024-01-01' },
   *   { test_id: '2', score: 90, submitted_at: '2024-01-02' }
   * ]
   * const avg = GradeCalculator.calculateTestsAverage(attempts)
   * // avg = 85
   * ```
   */
  static calculateTestsAverage(attempts: TestAttempt[]): number {
    // Filtrar apenas tentativas submetidas com score > 0
    const completedAttempts = attempts.filter(
      a => a.submitted_at && a.score > 0
    )

    if (completedAttempts.length === 0) {
      return 0
    }

    const sum = completedAttempts.reduce((acc, a) => acc + a.score, 0)
    const average = sum / completedAttempts.length

    // Arredondar para 1 casa decimal
    return Math.round(average * 10) / 10
  }

  /**
   * Calcula média de um array de números
   *
   * @param numbers - Array de números
   * @returns Média aritmética arredondada para 1 casa decimal
   */
  static average(numbers: number[]): number {
    if (numbers.length === 0) return 0

    const sum = numbers.reduce((a, b) => a + b, 0)
    const avg = sum / numbers.length

    return Math.round(avg * 10) / 10
  }

  /**
   * Calcula média final ponderada com overrides opcionais
   *
   * Fórmula: (testsAvg × testsWeight + tccGrade × tccWeight) / (testsWeight + tccWeight)
   *
   * @param testsAverage - Média calculada dos testes
   * @param tccGrade - Nota do TCC (null se não avaliado)
   * @param overrides - Ajustes manuais opcionais
   * @returns Objeto com todas as métricas calculadas
   *
   * @example
   * ```ts
   * const metrics = GradeCalculator.calculateFinalAverage(80, 90, {
   *   testsWeight: 2,
   *   tccWeight: 1
   * })
   * // finalAverage = (80×2 + 90×1) / 3 = 83.33
   * ```
   */
  static calculateFinalAverage(
    testsAverage: number,
    tccGrade: number | null,
    overrides?: GradeOverride
  ): GradeMetrics {
    // Aplicar overrides se fornecidos
    const testsAvg = overrides?.testsAverageOverride !== undefined && overrides.testsAverageOverride !== null
      ? overrides.testsAverageOverride
      : testsAverage

    const testsWeight = overrides?.testsWeight !== undefined
      ? Math.max(overrides.testsWeight, 0)
      : 1

    const tccScore = overrides?.tccGradeOverride !== undefined && overrides.tccGradeOverride !== null
      ? overrides.tccGradeOverride
      : (tccGrade ?? 0)

    const tccWeight = overrides?.tccWeight !== undefined
      ? Math.max(overrides.tccWeight, 0)
      : 1

    // Calcular média ponderada
    const denominator = testsWeight + tccWeight
    let finalAverage = 0

    if (denominator > 0) {
      finalAverage = (testsAvg * testsWeight + tccScore * tccWeight) / denominator
      finalAverage = Math.round(finalAverage * 10) / 10
    }

    return {
      testsAverageEffective: testsAvg,
      testsAverageRaw: testsAverage,
      testsWeight,
      tccGradeEffective: tccScore,
      tccGradeRaw: tccGrade,
      tccWeight,
      finalAverage,
      denominator
    }
  }

  /**
   * Calcula média geral ponderada com pesos padrão (testes: 1, TCC: 2)
   *
   * @param testAverage - Média dos testes
   * @param tccScore - Nota do TCC
   * @returns Média geral arredondada para 1 casa decimal
   */
  static generalAverage(testAverage: number, tccScore: number): number {
    const result = ((testAverage * 1) + (tccScore * 2)) / 3
    return Math.round(result * 10) / 10
  }

  /**
   * Determina se o aluno está aprovado baseado na média final
   *
   * @param average - Média final
   * @param threshold - Nota de corte (padrão: 70)
   * @returns true se aprovado, false caso contrário
   */
  static isApproved(average: number, threshold: number = 70): boolean {
    return average >= threshold
  }

  /**
   * Calcula porcentagem de progresso
   *
   * @param completed - Quantidade completada
   * @param total - Quantidade total
   * @returns Porcentagem arredondada (0-100)
   */
  static calculateProgress(completed: number, total: number): number {
    if (total === 0) return 0

    const percentage = (completed / total) * 100
    return Math.round(percentage)
  }

  /**
   * Valida se uma nota está dentro do range válido (0-100)
   *
   * @param grade - Nota a validar
   * @returns true se válida, false caso contrário
   */
  static isValidGrade(grade: number | null | undefined): boolean {
    if (grade === null || grade === undefined) return false
    return grade >= 0 && grade <= 100
  }

  /**
   * Normaliza valor numérico para nota válida
   *
   * @param value - Valor a normalizar
   * @returns Nota entre 0-100 ou null se inválido
   */
  static normalizeGrade(value: any): number | null {
    const num = Number(value)

    if (!Number.isFinite(num)) return null
    if (num < 0) return 0
    if (num > 100) return 100

    return Math.round(num * 10) / 10
  }
}

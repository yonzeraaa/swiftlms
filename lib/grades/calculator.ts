export interface TestResult {
  correctAnswers: number
  totalQuestions: number
}

export const calculateTestGrade = (result: TestResult): number => {
  if (result.totalQuestions === 0) {
    return 0
  }

  const grade = (result.correctAnswers / result.totalQuestions) * 10
  return Math.round(grade * 10) / 10 // Arredondar para 1 casa decimal
}

export const calculateModuleGrade = (testGrades: number[], weights?: number[]): number => {
  if (testGrades.length === 0) {
    return 0
  }

  if (!weights || weights.length !== testGrades.length) {
    // Média simples se não houver pesos
    const sum = testGrades.reduce((acc, grade) => acc + grade, 0)
    return Math.round((sum / testGrades.length) * 10) / 10
  }

  // Média ponderada
  const weightSum = weights.reduce((acc, w) => acc + w, 0)
  if (weightSum === 0) {
    return 0
  }

  const weightedSum = testGrades.reduce((acc, grade, i) => acc + grade * weights[i], 0)
  return Math.round((weightedSum / weightSum) * 10) / 10
}

export const calculateCourseGrade = (moduleGrades: number[]): number => {
  return calculateModuleGrade(moduleGrades) // Média simples dos módulos
}

export const isApproved = (grade: number, passingGrade: number = 7.0): boolean => {
  return grade >= passingGrade
}

export const formatGrade = (grade: number): string => {
  return grade.toFixed(1).replace('.', ',')
}

export const parseGrade = (gradeStr: string): number => {
  return parseFloat(gradeStr.replace(',', '.'))
}

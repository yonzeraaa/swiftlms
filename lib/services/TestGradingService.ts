import { calculateTestGrade, isApproved, type TestResult } from '../grades/calculator'

export interface TestAnswer {
  question_id: string
  selected_option_id: string | null
}

export interface Question {
  id: string
  type: 'multiple_choice' | 'true_false' | 'essay'
  points: number
}

export interface QuestionOption {
  id: string
  question_id: string
  is_correct: boolean
}

export interface GradingResult {
  score: number
  correctAnswers: number
  totalQuestions: number
  passed: boolean
  feedback: string
}

export class TestGradingService {
  gradeTest(
    answers: TestAnswer[],
    questions: Question[],
    options: QuestionOption[],
    passingScore: number = 7.0
  ): GradingResult {
    this.validateAnswers(answers, questions)

    let correctCount = 0

    for (const answer of answers) {
      if (!answer.selected_option_id) {
        continue // Questão não respondida
      }

      const option = options.find(opt => opt.id === answer.selected_option_id)
      if (option && option.is_correct) {
        correctCount++
      }
    }

    const score = calculateTestGrade({
      correctAnswers: correctCount,
      totalQuestions: questions.length,
    })

    const passed = isApproved(score, passingScore)

    return {
      score,
      correctAnswers: correctCount,
      totalQuestions: questions.length,
      passed,
      feedback: this.getFeedbackMessage(passed, score),
    }
  }

  validateAnswers(answers: TestAnswer[], questions: Question[]): void {
    // Verificar se todas as questões existem
    const questionIds = questions.map(q => q.id)

    for (const answer of answers) {
      if (!questionIds.includes(answer.question_id)) {
        throw new Error(`Questão com ID ${answer.question_id} não existe neste teste`)
      }
    }

    // Verificar respostas duplicadas
    const answeredIds = new Set<string>()
    for (const answer of answers) {
      if (answeredIds.has(answer.question_id)) {
        throw new Error(`Resposta duplicada para questão ${answer.question_id}`)
      }
      answeredIds.add(answer.question_id)
    }
  }

  getFeedbackMessage(passed: boolean, score: number): string {
    if (passed) {
      if (score === 10.0) {
        return 'Parabéns! Você acertou todas as questões!'
      } else if (score >= 9.0) {
        return 'Excelente desempenho! Continue assim!'
      } else {
        return 'Aprovado! Bom trabalho!'
      }
    } else {
      if (score >= 5.0) {
        return 'Você não atingiu a nota mínima. Revise o conteúdo e tente novamente.'
      } else {
        return 'É recomendado revisar todo o conteúdo do módulo antes de tentar novamente.'
      }
    }
  }
}

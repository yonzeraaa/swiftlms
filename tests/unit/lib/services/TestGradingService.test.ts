import { describe, it, expect, beforeEach } from 'vitest'
import {
  TestGradingService,
  type TestAnswer,
  type Question,
  type QuestionOption,
} from '@/lib/services/TestGradingService'

describe('TestGradingService', () => {
  let service: TestGradingService

  beforeEach(() => {
    service = new TestGradingService()
  })

  const createMockQuestion = (id: string, type: 'multiple_choice' | 'true_false' = 'multiple_choice'): Question => ({
    id,
    type,
    points: 1,
  })

  const createMockOption = (id: string, questionId: string, isCorrect: boolean): QuestionOption => ({
    id,
    question_id: questionId,
    is_correct: isCorrect,
  })

  describe('gradeTest - multiple choice', () => {
    it('should calculate 10.0 for all correct answers', () => {
      const questions = [
        createMockQuestion('q1'),
        createMockQuestion('q2'),
      ]

      const options = [
        createMockOption('opt1', 'q1', true),
        createMockOption('opt2', 'q1', false),
        createMockOption('opt3', 'q2', true),
        createMockOption('opt4', 'q2', false),
      ]

      const answers: TestAnswer[] = [
        { question_id: 'q1', selected_option_id: 'opt1' },
        { question_id: 'q2', selected_option_id: 'opt3' },
      ]

      const result = service.gradeTest(answers, questions, options)

      expect(result.score).toBe(10.0)
      expect(result.correctAnswers).toBe(2)
      expect(result.totalQuestions).toBe(2)
      expect(result.passed).toBe(true)
    })

    it('should calculate 5.0 for half correct answers', () => {
      const questions = [
        createMockQuestion('q1'),
        createMockQuestion('q2'),
      ]

      const options = [
        createMockOption('opt1', 'q1', true),
        createMockOption('opt2', 'q1', false),
        createMockOption('opt3', 'q2', true),
        createMockOption('opt4', 'q2', false),
      ]

      const answers: TestAnswer[] = [
        { question_id: 'q1', selected_option_id: 'opt1' }, // Correto
        { question_id: 'q2', selected_option_id: 'opt4' }, // Errado
      ]

      const result = service.gradeTest(answers, questions, options)

      expect(result.score).toBe(5.0)
      expect(result.correctAnswers).toBe(1)
      expect(result.passed).toBe(false)
    })

    it('should return 0 for all wrong answers', () => {
      const questions = [
        createMockQuestion('q1'),
        createMockQuestion('q2'),
      ]

      const options = [
        createMockOption('opt1', 'q1', true),
        createMockOption('opt2', 'q1', false),
        createMockOption('opt3', 'q2', true),
        createMockOption('opt4', 'q2', false),
      ]

      const answers: TestAnswer[] = [
        { question_id: 'q1', selected_option_id: 'opt2' },
        { question_id: 'q2', selected_option_id: 'opt4' },
      ]

      const result = service.gradeTest(answers, questions, options)

      expect(result.score).toBe(0)
      expect(result.correctAnswers).toBe(0)
      expect(result.passed).toBe(false)
    })
  })

  describe('gradeTest - unanswered questions', () => {
    it('should not penalize unanswered questions', () => {
      const questions = [
        createMockQuestion('q1'),
        createMockQuestion('q2'),
        createMockQuestion('q3'),
      ]

      const options = [
        createMockOption('opt1', 'q1', true),
        createMockOption('opt2', 'q2', true),
        createMockOption('opt3', 'q3', true),
      ]

      const answers: TestAnswer[] = [
        { question_id: 'q1', selected_option_id: 'opt1' }, // Correto
        { question_id: 'q2', selected_option_id: null },   // Não respondida
      ]

      const result = service.gradeTest(answers, questions, options)

      // 1 correta de 3 = 3.33...
      expect(result.score).toBe(3.3)
      expect(result.correctAnswers).toBe(1)
      expect(result.totalQuestions).toBe(3)
    })
  })

  describe('validateAnswers', () => {
    it('should reject answers with non-existent question_id', () => {
      const questions = [createMockQuestion('q1')]
      const answers: TestAnswer[] = [
        { question_id: 'invalid_id', selected_option_id: 'opt1' },
      ]

      expect(() => {
        service.validateAnswers(answers, questions)
      }).toThrow('Questão com ID invalid_id não existe neste teste')
    })

    it('should reject duplicate answers for same question', () => {
      const questions = [createMockQuestion('q1')]
      const answers: TestAnswer[] = [
        { question_id: 'q1', selected_option_id: 'opt1' },
        { question_id: 'q1', selected_option_id: 'opt2' },
      ]

      expect(() => {
        service.validateAnswers(answers, questions)
      }).toThrow('Resposta duplicada para questão q1')
    })

    it('should accept valid answers', () => {
      const questions = [
        createMockQuestion('q1'),
        createMockQuestion('q2'),
      ]
      const answers: TestAnswer[] = [
        { question_id: 'q1', selected_option_id: 'opt1' },
        { question_id: 'q2', selected_option_id: 'opt2' },
      ]

      expect(() => {
        service.validateAnswers(answers, questions)
      }).not.toThrow()
    })
  })

  describe('getFeedbackMessage', () => {
    it('should return congratulations for perfect score', () => {
      const feedback = service.getFeedbackMessage(true, 10.0)
      expect(feedback).toContain('Parabéns')
      expect(feedback).toContain('todas as questões')
    })

    it('should return excellent feedback for score >= 9.0', () => {
      const feedback = service.getFeedbackMessage(true, 9.5)
      expect(feedback).toContain('Excelente')
    })

    it('should return approval feedback for passing score', () => {
      const feedback = service.getFeedbackMessage(true, 7.5)
      expect(feedback).toContain('Aprovado')
    })

    it('should return review feedback for failing score >= 5.0', () => {
      const feedback = service.getFeedbackMessage(false, 6.0)
      expect(feedback).toContain('Revise o conteúdo')
    })

    it('should return strong review feedback for low failing score', () => {
      const feedback = service.getFeedbackMessage(false, 3.0)
      expect(feedback).toContain('revisar todo o conteúdo')
    })
  })

  describe('passing score validation', () => {
    it('should respect custom passing score', () => {
      const questions = [createMockQuestion('q1')]
      const options = [createMockOption('opt1', 'q1', true)]
      const answers: TestAnswer[] = [
        { question_id: 'q1', selected_option_id: 'opt1' },
      ]

      const resultWith8 = service.gradeTest(answers, questions, options, 8.0)
      expect(resultWith8.score).toBe(10.0)
      expect(resultWith8.passed).toBe(true)

      const resultWith11 = service.gradeTest(answers, questions, options, 11.0)
      expect(resultWith11.score).toBe(10.0)
      expect(resultWith11.passed).toBe(false) // 10.0 < 11.0
    })
  })
})

import { fakerPT_BR as faker } from '@faker-js/faker'
import { createFactory, type FactoryOptions } from './base.factory'

export interface TestTest {
  id: string
  module_id: string
  title: string
  description?: string
  passing_score: number
  max_attempts?: number
  time_limit_minutes?: number
  type: 'graded' | 'practice'
  created_at: string
  updated_at: string
}

export interface TestQuestion {
  id: string
  test_id: string
  type: 'multiple_choice' | 'true_false' | 'essay'
  question_text: string
  order: number
  points: number
  created_at: string
  updated_at: string
}

export interface TestQuestionOption {
  id: string
  question_id: string
  option_text: string
  is_correct: boolean
  order: number
}

export const createTest = createFactory<TestTest>(() => ({
  id: faker.string.uuid(),
  module_id: faker.string.uuid(),
  title: `Avaliação ${faker.lorem.words(2)}`,
  description: faker.lorem.paragraph(),
  passing_score: 7.0,
  max_attempts: 3,
  time_limit_minutes: 60,
  type: 'graded',
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}))

export const createQuestion = createFactory<TestQuestion>(() => ({
  id: faker.string.uuid(),
  test_id: faker.string.uuid(),
  type: 'multiple_choice',
  question_text: faker.lorem.sentence() + '?',
  order: faker.number.int({ min: 1, max: 20 }),
  points: 1,
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}))

export const createQuestionOption = createFactory<TestQuestionOption>(() => ({
  id: faker.string.uuid(),
  question_id: faker.string.uuid(),
  option_text: faker.lorem.sentence(),
  is_correct: false,
  order: faker.number.int({ min: 1, max: 4 }),
}))

export const createQuestionWithOptions = (overrides?: Partial<TestQuestion>) => {
  const question = createQuestion(overrides)
  const options = [
    createQuestionOption({ question_id: question.id, is_correct: true, order: 1 }),
    createQuestionOption({ question_id: question.id, is_correct: false, order: 2 }),
    createQuestionOption({ question_id: question.id, is_correct: false, order: 3 }),
    createQuestionOption({ question_id: question.id, is_correct: false, order: 4 }),
  ]
  return { question, options }
}

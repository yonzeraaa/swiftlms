import { fakerPT_BR as faker } from '@faker-js/faker'
import { createFactory, type FactoryOptions } from './base.factory'

export interface TestEnrollment {
  id: string
  student_id: string
  course_id: string
  progress: number
  status: 'active' | 'completed' | 'dropped'
  enrolled_at: string
  completed_at?: string | null
  created_at: string
  updated_at: string
}

export const createEnrollment = createFactory<TestEnrollment>(() => ({
  id: faker.string.uuid(),
  student_id: faker.string.uuid(),
  course_id: faker.string.uuid(),
  progress: 0,
  status: 'active',
  enrolled_at: faker.date.past().toISOString(),
  completed_at: null,
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}))

export const createCompletedEnrollment = (overrides?: FactoryOptions<TestEnrollment>) =>
  createEnrollment({
    progress: 100,
    status: 'completed',
    completed_at: faker.date.recent().toISOString(),
    ...overrides,
  })

export const createActiveEnrollment = (overrides?: FactoryOptions<TestEnrollment>) =>
  createEnrollment({ status: 'active', progress: faker.number.int({ min: 0, max: 99 }), ...overrides })

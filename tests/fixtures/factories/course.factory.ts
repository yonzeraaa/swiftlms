import { fakerPT_BR as faker } from '@faker-js/faker'
import { createFactory, type FactoryOptions } from './base.factory'

export interface TestCourse {
  id: string
  title: string
  description: string
  slug: string
  organization_id: string
  instructor_id: string
  status: 'active' | 'inactive' | 'draft'
  duration_hours?: number
  created_at: string
  updated_at: string
}

export const createCourse = createFactory<TestCourse>(() => {
  const title = faker.lorem.words(3)
  return {
    id: faker.string.uuid(),
    title,
    description: faker.lorem.paragraph(),
    slug: faker.helpers.slugify(title).toLowerCase(),
    organization_id: faker.string.uuid(),
    instructor_id: faker.string.uuid(),
    status: 'active',
    duration_hours: faker.number.int({ min: 10, max: 200 }),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
  }
})

export const createActiveCourse = (overrides?: FactoryOptions<TestCourse>) =>
  createCourse({ status: 'active', ...overrides })

export const createInactiveCourse = (overrides?: FactoryOptions<TestCourse>) =>
  createCourse({ status: 'inactive', ...overrides })

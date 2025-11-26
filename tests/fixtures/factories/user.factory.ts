import { fakerPT_BR as faker } from '@faker-js/faker'
import { createFactory, type FactoryOptions } from './base.factory'

export type UserRole = 'student' | 'teacher' | 'admin'

export interface TestUser {
  id: string
  email: string
  name: string
  role: UserRole
  organization_id: string
  cpf?: string
  phone?: string
  created_at: string
  updated_at: string
}

export const createUser = createFactory<TestUser>(() => ({
  id: faker.string.uuid(),
  email: faker.internet.email().toLowerCase(),
  name: faker.person.fullName(),
  role: 'student',
  organization_id: faker.string.uuid(),
  cpf: undefined,
  phone: undefined,
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}))

export const createStudent = (overrides?: FactoryOptions<TestUser>) =>
  createUser({ role: 'student', ...overrides })

export const createTeacher = (overrides?: FactoryOptions<TestUser>) =>
  createUser({ role: 'teacher', ...overrides })

export const createAdmin = (overrides?: FactoryOptions<TestUser>) =>
  createUser({ role: 'admin', ...overrides })

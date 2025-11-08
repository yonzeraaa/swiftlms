import { fakerPT_BR as faker } from '@faker-js/faker'

export type FactoryOptions<T> = Partial<T>

export const createFactory = <T>(defaults: () => T) => {
  return (overrides?: FactoryOptions<T>): T => {
    return {
      ...defaults(),
      ...overrides,
    }
  }
}

export const setDeterministicSeed = () => {
  faker.seed(12345)
}

export const setRandomSeed = () => {
  faker.seed(Date.now())
}

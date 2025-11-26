import { describe, it, expect } from 'vitest'
import { deepClone, pick, omit } from '@/lib/utils/object'

describe('Object Utils', () => {
  describe('deepClone', () => {
    it('should clone simple object', () => {
      const obj = { name: 'John', age: 30 }
      const cloned = deepClone(obj)

      expect(cloned).toEqual(obj)
      expect(cloned).not.toBe(obj)
    })

    it('should clone nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          address: { city: 'NYC' }
        }
      }
      const cloned = deepClone(obj)

      expect(cloned).toEqual(obj)
      expect(cloned.user).not.toBe(obj.user)
      expect(cloned.user.address).not.toBe(obj.user.address)
    })

    it('should clone arrays', () => {
      const obj = { items: [1, 2, 3] }
      const cloned = deepClone(obj)

      expect(cloned).toEqual(obj)
      expect(cloned.items).not.toBe(obj.items)
    })
  })

  describe('pick', () => {
    it('should extract specified properties', () => {
      const obj = { name: 'John', age: 30, city: 'NYC' }
      const result = pick(obj, ['name', 'age'])

      expect(result).toEqual({ name: 'John', age: 30 })
    })

    it('should handle non-existent keys gracefully', () => {
      const obj = { name: 'John' }
      const result = pick(obj, ['name', 'age' as any])

      expect(result).toHaveProperty('name')
      expect(result).not.toHaveProperty('age')
    })

    it('should return empty object for empty keys array', () => {
      const obj = { name: 'John', age: 30 }
      const result = pick(obj, [])

      expect(result).toEqual({})
    })
  })

  describe('omit', () => {
    it('should remove specified properties', () => {
      const obj = { name: 'John', age: 30, city: 'NYC' }
      const result = omit(obj, ['age'])

      expect(result).toEqual({ name: 'John', city: 'NYC' })
    })

    it('should handle multiple keys', () => {
      const obj = { name: 'John', age: 30, city: 'NYC' }
      const result = omit(obj, ['age', 'city'])

      expect(result).toEqual({ name: 'John' })
    })

    it('should handle non-existent keys gracefully', () => {
      const obj = { name: 'John' }
      const result = omit(obj, ['age' as any])

      expect(result).toEqual({ name: 'John' })
    })
  })
})

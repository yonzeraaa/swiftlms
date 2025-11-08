import { describe, it, expect } from 'vitest'
import { parseJSON, safeStringify } from '@/lib/parsers/json'

describe('JSON Parsers', () => {
  describe('parseJSON', () => {
    it('should parse valid JSON string', () => {
      const result = parseJSON('{"name": "John", "age": 30}')

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ name: 'John', age: 30 })
      expect(result.error).toBeUndefined()
    })

    it('should return error for invalid JSON', () => {
      const result = parseJSON('{ invalid json }')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.data).toBeUndefined()
    })

    it('should handle empty object', () => {
      const result = parseJSON('{}')

      expect(result.success).toBe(true)
      expect(result.data).toEqual({})
    })

    it('should handle arrays', () => {
      const result = parseJSON('[1, 2, 3]')

      expect(result.success).toBe(true)
      expect(result.data).toEqual([1, 2, 3])
    })

    it('should handle nested objects', () => {
      const result = parseJSON('{"user": {"name": "John", "address": {"city": "NYC"}}}')

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        user: { name: 'John', address: { city: 'NYC' } }
      })
    })
  })

  describe('safeStringify', () => {
    it('should stringify object', () => {
      const result = safeStringify({ name: 'John', age: 30 })
      expect(result).toBe('{"name":"John","age":30}')
    })

    it('should stringify with pretty print', () => {
      const result = safeStringify({ name: 'John' }, true)
      expect(result).toContain('\n')
      expect(result).toContain('  ')
    })

    it('should return "{}" for circular references', () => {
      const obj: any = { name: 'John' }
      obj.self = obj

      const result = safeStringify(obj)
      expect(result).toBe('{}')
    })

    it('should handle null', () => {
      const result = safeStringify(null)
      expect(result).toBe('null')
    })
  })
})

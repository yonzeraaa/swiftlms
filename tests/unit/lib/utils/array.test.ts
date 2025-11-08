import { describe, it, expect } from 'vitest'
import { unique, groupBy, chunk, arrayToMap } from '@/lib/utils/array'

describe('Array Utils', () => {
  describe('unique', () => {
    it('should remove duplicate primitives', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
    })

    it('should remove duplicate strings', () => {
      expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
    })

    it('should handle empty array', () => {
      expect(unique([])).toEqual([])
    })

    it('should preserve order of first occurrence', () => {
      expect(unique([3, 1, 2, 1, 3])).toEqual([3, 1, 2])
    })
  })

  describe('groupBy', () => {
    it('should group objects by property', () => {
      const items = [
        { id: 1, category: 'A' },
        { id: 2, category: 'B' },
        { id: 3, category: 'A' },
      ]

      const result = groupBy(items, 'category')

      expect(result).toEqual({
        A: [{ id: 1, category: 'A' }, { id: 3, category: 'A' }],
        B: [{ id: 2, category: 'B' }],
      })
    })

    it('should handle empty array', () => {
      expect(groupBy([], 'key' as any)).toEqual({})
    })

    it('should convert numeric keys to strings', () => {
      const items = [{ id: 1, value: 10 }, { id: 2, value: 10 }]
      const result = groupBy(items, 'value')

      expect(result).toHaveProperty('10')
      expect(result['10']).toHaveLength(2)
    })
  })

  describe('chunk', () => {
    it('should split array into chunks', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    })

    it('should handle exact division', () => {
      expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]])
    })

    it('should handle chunk size larger than array', () => {
      expect(chunk([1, 2], 5)).toEqual([[1, 2]])
    })

    it('should handle empty array', () => {
      expect(chunk([], 2)).toEqual([])
    })
  })

  describe('arrayToMap', () => {
    it('should convert array to Map by key', () => {
      const items = [
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ]

      const result = arrayToMap(items, 'id')

      expect(result.get('1')).toEqual({ id: '1', name: 'John' })
      expect(result.get('2')).toEqual({ id: '2', name: 'Jane' })
      expect(result.size).toBe(2)
    })

    it('should handle duplicate keys (last wins)', () => {
      const items = [
        { id: '1', name: 'John' },
        { id: '1', name: 'Jane' },
      ]

      const result = arrayToMap(items, 'id')

      expect(result.get('1')?.name).toBe('Jane')
      expect(result.size).toBe(1)
    })
  })
})

import { useState, useEffect, useCallback } from 'react'
import { SupabaseService, QueryOptions, SupabaseError } from '@/app/lib/supabase-service'

interface UseSupabaseQueryResult<T> {
  data: T[] | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  setData: (data: T[]) => void
}

export function useSupabaseQuery<T = any>(
  tableName: string,
  options?: QueryOptions,
  dependencies: any[] = []
): UseSupabaseQueryResult<T> {
  const [data, setData] = useState<T[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const service = new SupabaseService<T>(tableName)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await service.findAll(options)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [tableName, JSON.stringify(options)])

  useEffect(() => {
    fetchData()
  }, [...dependencies])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    setData
  }
}

// Hook for single item query
export function useSupabaseItem<T = any>(
  tableName: string,
  id: string | null,
  select?: string
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const service = new SupabaseService<T>(tableName)

  useEffect(() => {
    if (!id) {
      setData(null)
      setLoading(false)
      return
    }

    const fetchItem = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await service.findById(id, select)
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchItem()
  }, [tableName, id, select])

  return { data, loading, error }
}
import { createClient } from '@/lib/supabase/client'
import { PostgrestError } from '@supabase/supabase-js'

export interface QueryOptions {
  select?: string
  orderBy?: string
  ascending?: boolean
  limit?: number
  offset?: number
  filters?: Array<{
    column: string
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in'
    value: any
  }>
}

export class SupabaseError extends Error {
  constructor(public originalError: PostgrestError) {
    super(originalError.message)
    this.name = 'SupabaseError'
  }
}

// Generic service that works with any table
export class SupabaseService<T = any> {
  private supabase = createClient()

  constructor(private tableName: string) {}

  async findAll(options?: QueryOptions): Promise<T[]> {
    let query = this.supabase
      .from(this.tableName as any)
      .select(options?.select || '*')

    // Apply filters
    if (options?.filters) {
      for (const filter of options.filters) {
        query = (query as any)[filter.operator](filter.column, filter.value)
      }
    }

    // Apply ordering
    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false })
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error } = await query

    if (error) throw new SupabaseError(error)
    return (data || []) as T[]
  }

  async findById(id: string, select?: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.tableName as any)
      .select(select || '*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new SupabaseError(error)
    }
    return data as T
  }

  async create(item: any): Promise<T> {
    const { data, error } = await this.supabase
      .from(this.tableName as any)
      .insert(item)
      .select()
      .single()

    if (error) throw new SupabaseError(error)
    return data as T
  }

  async update(id: string, updates: any): Promise<T> {
    const { data, error } = await this.supabase
      .from(this.tableName as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new SupabaseError(error)
    return data as T
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName as any)
      .delete()
      .eq('id', id)

    if (error) throw new SupabaseError(error)
  }

  async deleteMany(ids: string[]): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName as any)
      .delete()
      .in('id', ids)

    if (error) throw new SupabaseError(error)
  }

  async count(filters?: QueryOptions['filters']): Promise<number> {
    let query = this.supabase
      .from(this.tableName as any)
      .select('*', { count: 'exact', head: true })

    if (filters) {
      for (const filter of filters) {
        query = (query as any)[filter.operator](filter.column, filter.value)
      }
    }

    const { count, error } = await query

    if (error) throw new SupabaseError(error)
    return count || 0
  }

  async exists(id: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(this.tableName as any)
      .select('id')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return false
      throw new SupabaseError(error)
    }
    return !!data
  }

  // Batch operations
  async createMany(items: any[]): Promise<T[]> {
    const { data, error } = await this.supabase
      .from(this.tableName as any)
      .insert(items)
      .select()

    if (error) throw new SupabaseError(error)
    return (data || []) as T[]
  }

  // Real-time subscriptions
  subscribeToChanges(
    callback: (payload: any) => void,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
  ) {
    return this.supabase
      .channel(`${this.tableName}_changes`)
      .on(
        'postgres_changes' as any,
        { event, schema: 'public', table: this.tableName },
        callback
      )
      .subscribe()
  }
}
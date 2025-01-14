import { createClient } from '@/app/_lib/supabase-server'
import { FetchError } from '@/app/_lib/fetch-helpers'
import type { SupabaseClient, PostgrestError, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { revalidatePath as nextRevalidatePath } from 'next/cache'

type DbClient = SupabaseClient
type DbRecord = Record<string, any>

interface QueryOptions {
  errorMap?: Record<string, { message: string; status?: number }>
  revalidatePath?: string
}

interface QueryResult<T> {
  data: T | null
  error: PostgrestError | null
}

interface ExecuteQueryProps<T> {
  query: (client: DbClient) => Promise<QueryResult<T>>
  errorMap?: Record<string, { message: string; status?: number }>
  revalidatePath?: string
}

interface InsertRecordProps<T extends DbRecord> {
  table: string
  data: Partial<T>
  select?: string
  options?: QueryOptions
}

interface UpdateRecordProps<T extends DbRecord> {
  table: string
  data: Partial<T>
  match: Partial<T>
  select?: string
  options?: QueryOptions
}

interface DeleteRecordProps<T extends DbRecord> {
  table: string
  match: Partial<T>
  options?: QueryOptions
}

interface SelectRecordsProps<T extends DbRecord> {
  table: string
  select?: string
  match?: Partial<T>
  options?: QueryOptions
}

interface SubscriptionPayload<T> {
  eventType: string
  new: T | null
  old: T | null
}

interface SetupSubscriptionProps<T extends DbRecord> {
  table: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  schema?: string
  filter?: string
  onError?: (error: Error) => void
  onPayload: (payload: SubscriptionPayload<T>) => void
}

/**
 * Execute a database query with consistent error handling
 */
export async function executeQuery<T>({
  query,
  errorMap = {},
  revalidatePath
}: ExecuteQueryProps<T>): Promise<T> {
  const supabase = createClient()

  try {
    const { data, error } = await query(supabase)

    if (error) {
      // Handle known error codes
      if (error.code && errorMap[error.code]) {
        const mapped = errorMap[error.code]
        throw new FetchError(
          mapped.message,
          error.code,
          mapped.status || 500
        )
      }

      // Default error handling
      throw new FetchError(
        error.message || 'Database operation failed',
        error.code || 'DB_ERROR',
        500
      )
    }

    if (!data) {
      throw new FetchError(
        'Not found',
        'NOT_FOUND',
        404
      )
    }

    if (revalidatePath) {
      nextRevalidatePath(revalidatePath)
    }

    return data as T
  } catch (error) {
    if (error instanceof FetchError) {
      throw error
    }

    // Handle unexpected errors
    throw new FetchError(
      'An unexpected error occurred',
      'UNKNOWN_ERROR',
      500
    )
  }
}

/**
 * Insert a record with proper error handling
 */
export async function insertRecord<T extends DbRecord>({
  table,
  data,
  select = '*',
  options = {}
}: InsertRecordProps<T>): Promise<T> {
  const supabase = await createClient()

  return executeQuery<T>({
    query: async (supabase) => {
      const result = await supabase
        .from(table)
        .insert(data)
        .select(select)
        .single()
      
      return result as QueryResult<T>
    },
    ...options
  })
}

/**
 * Update a record with proper error handling
 */
export async function updateRecord<T extends DbRecord>({
  table,
  data,
  match = {},
  select = '*',
  options = {}
}: UpdateRecordProps<T>): Promise<T> {
  const supabase = await createClient()

  return executeQuery<T>({
    query: async (supabase) => {
      console.log(`Updating ${table} with data:`, data)
      console.log(`Match conditions:`, match)
      
      let query = supabase
        .from(table)
        .update(data)

      // Add all match conditions if match object exists
      if (match) {
        Object.entries(match).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.eq(key, value)
          }
        })
      }

      const result = await query.select(select).single()
      console.log(`Update result:`, result)
      return result as QueryResult<T>
    },
    ...options
  })
}

/**
 * Delete a record with proper error handling
 */
export async function deleteRecord<T extends DbRecord>({
  table,
  match = {},
  options = {}
}: DeleteRecordProps<T>): Promise<void> {
  const supabase = await createClient()

  await executeQuery<null>({
    query: async (supabase) => {
      let query = supabase
        .from(table)
        .delete()

      // Add all match conditions if match object exists
      if (match) {
        Object.entries(match).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.eq(key, value)
          }
        })
      }

      const result = await query
      return result as QueryResult<null>
    },
    ...options
  })
}

/**
 * Select records with proper error handling
 */
export async function selectRecords<T extends DbRecord>({
  table,
  select = '*',
  match = {},
  options = {}
}: SelectRecordsProps<T>): Promise<T[]> {
  const supabase = await createClient()

  return executeQuery<T[]>({
    query: async (supabase) => {
      console.log(`Selecting from ${table} with match conditions:`, match)
      
      let query = supabase
        .from(table)
        .select(select)

      // Add all match conditions if match object exists
      if (match) {
        Object.entries(match).forEach(([key, value]) => {
          if (value !== undefined) {
            console.log(`Adding match condition: ${key} = ${value}`)
            query = query.eq(key, value)
          }
        })
      }

      const result = await query
      console.log(`Select result:`, result)
      return result as QueryResult<T[]>
    },
    ...options
  })
}

/**
 * Setup a real-time subscription with proper error handling
 */
export async function setupSubscription<T extends DbRecord>({
  table,
  event = '*',
  schema = 'public',
  filter,
  onError = console.error,
  onPayload
}: SetupSubscriptionProps<T>): Promise<RealtimeChannel> {
  const supabase = createClient()
  
  return supabase
    .channel(`${table}-changes`)
    .on(
      'postgres_changes' as 'system',
      {
        event,
        schema,
        table,
        filter
      },
      (payload: RealtimePostgresChangesPayload<T>) => {
        try {
          onPayload({
            eventType: payload.eventType,
            new: (payload.new || null) as T | null,
            old: (payload.old || null) as T | null
          })
        } catch (error) {
          onError(error instanceof Error ? error : new Error('Unknown error'))
        }
      }
    )
    .subscribe()
} 
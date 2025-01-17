import { createClient } from '@/app/_lib/supabase-server'
import { handleDatabaseError, handleNotFoundError, handleUnexpectedError } from './error-handlers'
import { buildMatchConditions, handleRevalidation } from './query-builders'
import type { 
  DbRecord, 
  ExecuteQueryProps, 
  InsertRecordProps, 
  UpdateRecordProps, 
  DeleteRecordProps, 
  SelectRecordsProps,
  QueryResult,
  SupabaseClient
} from './types'

/**
 * Execute a database query with consistent error handling
 */
export async function executeQuery<T>({
  query,
  errorMap = {},
  revalidatePath
}: ExecuteQueryProps<T>): Promise<T> {
  const supabase = await createClient()

  try {
    const { data, error } = await query(supabase)

    if (error) {
      handleDatabaseError(error, errorMap)
    }

    if (!data) {
      handleNotFoundError()
    }

    handleRevalidation(revalidatePath)
    return data as T
  } catch (error) {
    handleUnexpectedError(error)
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
  return executeQuery<T>({
    query: async (supabase: SupabaseClient) => {
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
  return executeQuery<T>({
    query: async (supabase: SupabaseClient) => {
      let query = supabase
        .from(table)
        .update(data)

      query = buildMatchConditions(query, match)
      const result = await query.select(select).single()
      
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
  await executeQuery<null>({
    query: async (supabase: SupabaseClient) => {
      let query = supabase
        .from(table)
        .delete()

      query = buildMatchConditions(query, match)
      return await query as QueryResult<null>
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
  return executeQuery<T[]>({
    query: async (supabase: SupabaseClient) => {
      let query = supabase
        .from(table)
        .select(select)

      query = buildMatchConditions(query, match)
      return await query as QueryResult<T[]>
    },
    ...options
  })
} 
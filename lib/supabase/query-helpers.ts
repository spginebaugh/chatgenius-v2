"use client"

import type { PostgrestResponse } from '@supabase/supabase-js'
import { createClient, type DbClient } from './client'
import { FetchError } from '@/lib/client/fetch-helpers'

type DbRecord = Record<string, any>

interface QueryOptions {
  errorMap?: Record<string, { message: string; status?: number }>
  revalidatePath?: string
}

interface QueryResult<T> {
  data: T | null
  error: any
}

interface ExecuteQueryProps<T> {
  query: (client: DbClient) => Promise<QueryResult<T>>
  errorMap?: Record<string, { message: string; status?: number }>
}

interface SelectRecordsProps<T extends DbRecord> {
  table: string
  select?: string
  match?: Partial<T>
  options?: QueryOptions
}

/**
 * Execute a database query with consistent error handling
 */
export async function executeQuery<T>({
  query,
  errorMap = {}
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
 * Select records with proper error handling
 */
export async function selectRecords<T extends DbRecord>({
  table,
  select = '*',
  match,
  options = {}
}: SelectRecordsProps<T>): Promise<T[]> {
  return executeQuery<T[]>({
    query: async (supabase) => {
      let query = supabase
        .from(table)
        .select(select)

      // Add all match conditions
      if (match) {
        Object.entries(match).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
      }

      const result = await query
      return {
        data: (result.data || []) as unknown as T[],
        error: result.error
      }
    },
    ...options
  })
} 
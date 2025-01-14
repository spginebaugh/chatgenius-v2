"use client"

import type { PostgrestResponse } from '@supabase/supabase-js'
import { createClient, type DbClient } from './client'
import { FetchError } from '@/lib/client/fetch-helpers'

// Types
type DbRecord = Record<string, any>

interface ErrorMapEntry {
  message: string
  status?: number
}

interface QueryOptions {
  errorMap?: Record<string, ErrorMapEntry>
  revalidatePath?: string
}

interface QueryResult<T> {
  data: T | null
  error: any
}

interface ExecuteQueryProps<T> {
  query: (client: DbClient) => Promise<QueryResult<T>>
  errorMap?: Record<string, ErrorMapEntry>
}

interface SelectRecordsProps<T extends DbRecord> {
  table: string
  select?: string
  match?: Partial<T>
  options?: QueryOptions
}

// Error Handling
function createFetchError(error: any, errorMap: Record<string, ErrorMapEntry> = {}): FetchError {
  // Handle known error codes
  if (error.code && errorMap[error.code]) {
    const mapped = errorMap[error.code]
    return new FetchError(
      mapped.message,
      error.code,
      mapped.status || 500
    )
  }

  // Default error handling
  return new FetchError(
    error.message || 'Database operation failed',
    error.code || 'DB_ERROR',
    500
  )
}

function handleNotFoundError(): never {
  throw new FetchError(
    'Not found',
    'NOT_FOUND',
    404
  )
}

function handleUnexpectedError(error: unknown): never {
  if (error instanceof FetchError) {
    throw error
  }

  throw new FetchError(
    'An unexpected error occurred',
    'UNKNOWN_ERROR',
    500
  )
}

// Query Building
function buildMatchConditions<T extends DbRecord>(
  query: any,
  match?: Partial<T>
) {
  if (!match) return query

  return Object.entries(match).reduce((acc, [key, value]) => {
    return acc.eq(key, value)
  }, query)
}

async function executeSelectQuery<T extends DbRecord>(
  supabase: DbClient,
  table: string,
  select: string,
  match?: Partial<T>
): Promise<QueryResult<T[]>> {
  const baseQuery = supabase
    .from(table)
    .select(select)

  const query = buildMatchConditions(baseQuery, match)
  const result = await query

  return {
    data: (result.data || []) as T[],
    error: result.error
  }
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
      throw createFetchError(error, errorMap)
    }

    if (!data) {
      handleNotFoundError()
    }

    return data as T
  } catch (error) {
    handleUnexpectedError(error)
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
      return executeSelectQuery(supabase, table, select, match)
    },
    ...options
  })
} 
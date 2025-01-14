import { FetchError } from '@/app/_lib/fetch-helpers'
import type { PostgrestError } from '@supabase/supabase-js'

export function handleDatabaseError(error: PostgrestError, errorMap: Record<string, { message: string; status?: number }> = {}): never {
  if (error.code && errorMap[error.code]) {
    const mapped = errorMap[error.code]
    throw new FetchError(
      mapped.message,
      error.code,
      mapped.status || 500
    )
  }

  throw new FetchError(
    error.message || 'Database operation failed',
    error.code || 'DB_ERROR',
    500
  )
}

export function handleNotFoundError(): never {
  throw new FetchError(
    'Not found',
    'NOT_FOUND',
    404
  )
}

export function handleUnexpectedError(error: unknown): never {
  if (error instanceof FetchError) {
    throw error
  }

  throw new FetchError(
    'An unexpected error occurred',
    'UNKNOWN_ERROR',
    500
  )
} 
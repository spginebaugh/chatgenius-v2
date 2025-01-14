import { createClient } from '@/app/_lib/supabase-server'
import { DbMessage as Message, MessageType } from '@/types/database'

export class FetchError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 500
  ) {
    super(message)
    this.name = 'FetchError'
  }
}

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMap: Record<string, { message: string; status?: number }> = {}
): Promise<T> {
  try {
    return await operation()
  } catch (error: any) {
    console.error('Operation failed:', error)

    // Handle Supabase errors
    if (error?.code && errorMap[error.code]) {
      const mapped = errorMap[error.code]
      throw new FetchError(mapped.message, error.code, mapped.status)
    }

    // Handle known error types
    if (error instanceof FetchError) {
      throw error
    }

    // Default error
    throw new FetchError(
      error?.message || 'An unexpected error occurred',
      'UNKNOWN_ERROR'
    )
  }
}

export async function checkAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new FetchError(
      'Authentication required',
      'AUTH_REQUIRED',
      401
    )
  }
  
  return user
}

export function formatQueryError(error: any) {
  return {
    message: error?.message || 'Failed to fetch data',
    code: error?.code || 'QUERY_ERROR',
    status: error?.status || 500
  }
}

export async function preloadQuery<T>(
  queryFn: () => Promise<T>,
  options: { 
    required?: boolean
    errorMap?: Record<string, { message: string; status?: number }>
  } = {}
): Promise<T | null> {
  try {
    return await withErrorHandling(queryFn, options.errorMap)
  } catch (error) {
    if (options.required) {
      throw error
    }
    console.warn('Non-critical query failed:', error)
    return null
  }
}

// Batch loading helper
export async function batchLoad<T>(
  ids: string[],
  loadFn: (batchIds: string[]) => Promise<T[]>,
  options: {
    batchSize?: number
    errorMap?: Record<string, { message: string; status?: number }>
  } = {}
): Promise<T[]> {
  const { batchSize = 100 } = options
  const results: T[] = []
  
  // Process in batches
  for (let i = 0; i < ids.length; i += batchSize) {
    const batchIds = ids.slice(i, i + batchSize)
    const batchResults = await withErrorHandling(
      () => loadFn(batchIds),
      options.errorMap
    )
    results.push(...batchResults)
  }
  
  return results
}

// Parallel query helper
export async function parallelQueries<T extends Record<string, () => Promise<any>>>(
  queries: T
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const entries = Object.entries(queries)
  const results = await Promise.all(
    entries.map(async ([key, query]) => {
      try {
        const result = await query()
        return [key, result]
      } catch (error) {
        console.error(`Query ${key} failed:`, error)
        return [key, null]
      }
    })
  )
  
  return Object.fromEntries(results) as any
}

// Message-specific helpers
export function getMessageSelect(includeThreads: boolean = false) {
  return `
    *,
    user:users(*),
    reactions:message_reactions(
      *,
      user:users(*)
    ),
    files:message_files(*),
    mentions:message_mentions(
      *,
      mentioned_user:users(*)
    )
    ${includeThreads ? `,
    thread_messages:messages(
      *,
      user:users(*)
    )` : ''}
  `
}

export function validateMessageType(type: MessageType, data: Partial<Message>) {
  switch (type) {
    case 'channel':
      if (!data.channel_id) {
        throw new FetchError(
          'Channel messages require a channel_id',
          'INVALID_MESSAGE',
          400
        )
      }
      break
    case 'direct':
      if (!data.receiver_id) {
        throw new FetchError(
          'Direct messages require a receiver_id',
          'INVALID_MESSAGE',
          400
        )
      }
      break
    case 'thread':
      if (!data.parent_message_id) {
        throw new FetchError(
          'Thread messages require a parent_message_id',
          'INVALID_MESSAGE',
          400
        )
      }
      break
    default:
      throw new FetchError(
        'Invalid message type',
        'INVALID_MESSAGE',
        400
      )
  }
} 
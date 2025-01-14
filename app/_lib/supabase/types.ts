import type { SupabaseClient, PostgrestError, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export type DbClient = SupabaseClient
export type DbRecord = Record<string, any>

export interface QueryOptions {
  errorMap?: Record<string, { message: string; status?: number }>
  revalidatePath?: string
}

export interface QueryResult<T> {
  data: T | null
  error: PostgrestError | null
}

export interface ExecuteQueryProps<T> {
  query: (client: DbClient) => Promise<QueryResult<T>>
  errorMap?: Record<string, { message: string; status?: number }>
  revalidatePath?: string
}

export interface InsertRecordProps<T extends DbRecord> {
  table: string
  data: Partial<T>
  select?: string
  options?: QueryOptions
}

export interface UpdateRecordProps<T extends DbRecord> {
  table: string
  data: Partial<T>
  match: Partial<T>
  select?: string
  options?: QueryOptions
}

export interface DeleteRecordProps<T extends DbRecord> {
  table: string
  match: Partial<T>
  options?: QueryOptions
}

export interface SelectRecordsProps<T extends DbRecord> {
  table: string
  select?: string
  match?: Partial<T>
  options?: QueryOptions
}

export interface SubscriptionPayload<T> {
  eventType: string
  new: T | null
  old: T | null
}

export interface SetupSubscriptionProps<T extends DbRecord> {
  table: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  schema?: string
  filter?: string
  onError?: (error: Error) => void
  onPayload: (payload: SubscriptionPayload<T>) => void
} 
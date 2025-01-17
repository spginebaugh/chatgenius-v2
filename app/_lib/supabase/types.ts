import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js'

export type { SupabaseClient, PostgrestError }

export interface DbRecord {
  [key: string]: any
}

export interface ErrorMapEntry {
  message: string
  status?: number
}

export interface ExecuteQueryProps<T> {
  query: (supabase: SupabaseClient) => Promise<{ data: T | null; error: PostgrestError | null }>
  errorMap?: Record<string, ErrorMapEntry>
  revalidatePath?: string
}

export interface QueryResult<T> {
  data: T | null
  error: PostgrestError | null
}

export interface InsertRecordProps<T extends DbRecord> {
  table: string
  data: Partial<T>
  select?: string
  options?: {
    errorMap?: Record<string, ErrorMapEntry>
    revalidatePath?: string
  }
}

export interface UpdateRecordProps<T extends DbRecord> {
  table: string
  data: Partial<T>
  match?: Record<string, any>
  select?: string
  options?: {
    errorMap?: Record<string, ErrorMapEntry>
    revalidatePath?: string
  }
}

export interface DeleteRecordProps<T extends DbRecord> {
  table: string
  match?: Record<string, any>
  options?: {
    errorMap?: Record<string, ErrorMapEntry>
    revalidatePath?: string
  }
}

export interface SelectRecordsProps<T extends DbRecord> {
  table: string
  select?: string
  match?: Record<string, any>
  options?: {
    errorMap?: Record<string, ErrorMapEntry>
    revalidatePath?: string
  }
} 
import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js'

export type { SupabaseClient, PostgrestError }

export interface DbRecord {
  [key: string]: any
} 
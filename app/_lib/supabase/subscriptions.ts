import { createClient } from '@/app/_lib/supabase-server'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { DbRecord, SetupSubscriptionProps } from './types'

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
  const supabase = await createClient()
  
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
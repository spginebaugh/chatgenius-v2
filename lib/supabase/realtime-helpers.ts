"use client"

import { createClient } from './client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface SetupSubscriptionProps<T extends Record<string, any>> {
  table: string
  filter?: string
  onPayload: (payload: RealtimePostgresChangesPayload<T>) => void
}

export async function setupSubscription<T extends Record<string, any>>({ 
  table, 
  filter, 
  onPayload 
}: SetupSubscriptionProps<T>) {
  const supabase = createClient()

  // Debug: Check auth status
  const { data: { session } } = await supabase.auth.getSession()
  console.log('Setting up subscription with auth:', {
    userId: session?.user?.id,
    table,
    filter
  })

  // Create a unique channel name including the user ID to avoid conflicts
  const channelName = `${table}_${session?.user?.id}_${Date.now()}`
  console.log('Creating channel:', channelName)

  const channel = supabase.channel(channelName)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table,
      filter
    }, (payload: RealtimePostgresChangesPayload<T>) => {
      console.log(`[${channelName}] Received postgres_changes event:`, {
        event: payload.eventType,
        table,
        filter,
        new: payload.new,
        old: payload.old
      })
      onPayload(payload)
    })
    .subscribe(async (status) => {
      console.log(`[${channelName}] Subscription status:`, status)

      if (status === 'SUBSCRIBED') {
        // Debug: Verify the subscription is working
        const { data: testData, error: testError } = await supabase
          .from(table)
          .select('*')
          .limit(1)

        console.log(`[${channelName}] Testing SELECT permission:`, {
          success: !!testData,
          error: testError?.message,
          data: testData
        })
      }
    })

  return {
    unsubscribe: async () => {
      console.log(`[${channelName}] Unsubscribing...`)
      await channel.unsubscribe()
      console.log(`[${channelName}] Unsubscribed`)
    },
    topic: channel.topic,
    params: channel.params,
    socket: channel.socket,
    private: channel.private
  }
} 
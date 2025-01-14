"use client"

import { createClient } from './client'
import type { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js'

// Types
interface SetupSubscriptionProps<T extends { [key: string]: any }> {
  table: string
  filter?: string
  onPayload: (payload: RealtimePostgresChangesPayload<T>) => void
}

interface ChannelConfig {
  channelName: string
  table: string
  filter?: string
  userId?: string
}

// Helper functions
async function getAuthenticatedUserId() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id
}

function createChannelName({ table, userId }: { table: string, userId?: string }): string {
  return `${table}_${userId || 'anonymous'}_${Date.now()}`
}

function logSubscriptionEvent<T extends { [key: string]: any }>(channelName: string, payload: RealtimePostgresChangesPayload<T>) {
  console.log(`[${channelName}] Received postgres_changes event:`, {
    event: payload.eventType,
    new: payload.new,
    old: payload.old
  })
}

async function verifyTableAccess(channelName: string, table: string) {
  const supabase = createClient()
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

function setupChannel<T extends { [key: string]: any }>({
  channelName,
  table,
  filter,
  onPayload
}: ChannelConfig & Pick<SetupSubscriptionProps<T>, 'onPayload'>): RealtimeChannel {
  const supabase = createClient()
  
  return supabase.channel(channelName)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table,
      filter
    }, (payload: RealtimePostgresChangesPayload<T>) => {
      logSubscriptionEvent(channelName, payload)
      onPayload(payload)
    })
}

// Main function
export async function setupSubscription<T extends { [key: string]: any }>({ 
  table, 
  filter, 
  onPayload 
}: SetupSubscriptionProps<T>) {
  const userId = await getAuthenticatedUserId()
  const channelName = createChannelName({ table, userId })

  console.log('Setting up subscription:', {
    userId,
    table,
    filter,
    channelName
  })

  const channel = setupChannel<T>({
    channelName,
    table,
    filter,
    onPayload
  })

  await channel.subscribe(async (status) => {
    console.log(`[${channelName}] Subscription status:`, status)
    if (status === 'SUBSCRIBED') {
      await verifyTableAccess(channelName, table)
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
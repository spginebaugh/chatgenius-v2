"use client"

import { createClient } from './client'
import { setupSubscription } from './realtime-helpers'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Channel, DbMessage, User } from '@/types/database'

type TableName = 'channels' | 'messages' | 'message_reactions' | 'users'
type MessageType = 'channel' | 'direct' | 'thread'

// Type for our subscription return type
type SubscriptionReturn = Awaited<ReturnType<typeof setupSubscription>>

interface SubscriptionCallbacks<T> {
  onInsert?: (payload: T) => void
  onUpdate?: (payload: T) => void
  onDelete?: (payload: T) => void
}

interface CreateTableSubscriptionProps<T> {
  table: TableName
  filter?: string
  callbacks: SubscriptionCallbacks<T>
}

interface SubscribeToChannelMessagesProps {
  channelId: number
  callbacks: SubscriptionCallbacks<DbMessage>
}

interface SubscribeToDirectMessagesProps {
  userId: string
  otherUserId: string
  callbacks: SubscriptionCallbacks<DbMessage>
}

interface SubscribeToThreadMessagesProps {
  parentId: number
  callbacks: SubscriptionCallbacks<DbMessage>
}

interface SubscribeToReactionsProps {
  messageId: number
  callbacks: SubscriptionCallbacks<DbMessage>
}

interface SubscribeToUserStatusProps {
  userIds: string[]
  callbacks: SubscriptionCallbacks<User>
}

interface UnsubscribeAllProps {
  channels: (SubscriptionReturn | null)[]
}

/**
 * Creates a real-time subscription to a Supabase table
 */
function createTableSubscription<T extends Record<string, any>>({
  table,
  filter,
  callbacks
}: CreateTableSubscriptionProps<T>): Promise<SubscriptionReturn> {
  console.log(`Setting up subscription for ${table} with filter:`, filter)
  
  return setupSubscription<T>({
    table,
    filter,
    onPayload: ({ eventType, new: newRecord, old: oldRecord }) => {
      console.log(`Received ${table} event:`, { 
        eventType, 
        newRecord, 
        oldRecord,
        filter 
      })
      
      switch (eventType) {
        case 'INSERT':
          console.log(`Calling onInsert for ${table}`)
          callbacks.onInsert?.(newRecord as T)
          break
        case 'UPDATE':
          console.log(`Calling onUpdate for ${table}`)
          callbacks.onUpdate?.(newRecord as T)
          break
        case 'DELETE':
          console.log(`Calling onDelete for ${table}`)
          callbacks.onDelete?.(oldRecord as T)
          break
      }
    }
  })
}

/**
 * Creates a subscription to channel changes
 */
export function subscribeToChannels({
  callbacks
}: {
  callbacks: SubscriptionCallbacks<Channel>
}): Promise<SubscriptionReturn> {
  return createTableSubscription<Channel>({
    table: 'channels',
    callbacks
  })
}

/**
 * Creates a subscription to channel messages
 */
export function subscribeToChannelMessages({
  channelId,
  callbacks
}: SubscribeToChannelMessagesProps): Promise<SubscriptionReturn> {
  return createTableSubscription<DbMessage>({
    table: 'messages',
    filter: `and(channel_id.eq.${channelId},message_type.eq.channel)`,
    callbacks
  })
}

/**
 * Creates a subscription to direct messages between two users
 */
export function subscribeToDirectMessages({
  userId,
  otherUserId,
  callbacks
}: SubscribeToDirectMessagesProps): Promise<SubscriptionReturn> {
  return createTableSubscription<DbMessage>({
    table: 'messages',
    filter: `and(type.eq.direct,or(and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})))`,
    callbacks
  })
}

/**
 * Creates a subscription to thread messages for a parent message
 */
export function subscribeToThreadMessages({
  parentId,
  callbacks
}: SubscribeToThreadMessagesProps): Promise<SubscriptionReturn> {
  return createTableSubscription<DbMessage>({
    table: 'messages',
    filter: `and(parent_id.eq.${parentId},type.eq.thread)`,
    callbacks
  })
}

/**
 * Creates a subscription to reactions for a message
 */
export function subscribeToReactions({
  messageId,
  callbacks
}: SubscribeToReactionsProps): Promise<SubscriptionReturn> {
  return createTableSubscription<DbMessage>({
    table: 'message_reactions',
    filter: `message_id.eq.${messageId}`,
    callbacks
  })
}

/**
 * Creates a subscription to user status changes
 */
export function subscribeToUserStatus({
  userIds,
  callbacks
}: SubscribeToUserStatusProps): Promise<SubscriptionReturn> {
  return createTableSubscription<User>({
    table: 'users',
    filter: `id.in.(${userIds.join(',')})`,
    callbacks
  })
}

/**
 * Helper to unsubscribe from multiple channels
 */
export function unsubscribeAll({
  channels
}: UnsubscribeAllProps): void {
  channels.forEach(channel => channel?.unsubscribe())
} 
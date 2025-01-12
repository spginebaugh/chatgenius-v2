import { createClient } from "@/utils/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"
import type { Channel, ChannelMessage, DirectMessage, ThreadMessage, User, EmojiReaction } from "@/types/database"

type TableName = 'channels' | 'channel_messages' | 'direct_messages' | 'thread_messages' | 'emoji_reactions' | 'users'
type EventType = 'INSERT' | 'UPDATE' | 'DELETE'
type MessageType = 'channel_message' | 'direct_message' | 'thread_message'

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
  channelId: string
  callbacks: SubscriptionCallbacks<ChannelMessage>
}

interface SubscribeToDirectMessagesProps {
  userId: string
  otherUserId: string
  callbacks: SubscriptionCallbacks<DirectMessage>
}

interface SubscribeToThreadMessagesProps {
  parentId: string
  parentType: 'channel_message' | 'direct_message'
  callbacks: SubscriptionCallbacks<ThreadMessage>
}

interface SubscribeToReactionsProps {
  messageId: string
  messageType: MessageType
  callbacks: SubscriptionCallbacks<EmojiReaction>
}

interface SubscribeToUserStatusProps {
  userIds: string[]
  callbacks: SubscriptionCallbacks<User>
}

interface UnsubscribeAllProps {
  channels: (RealtimeChannel | null)[]
}

/**
 * Creates a real-time subscription to a Supabase table
 */
function createTableSubscription<T>({
  table,
  filter,
  callbacks
}: CreateTableSubscriptionProps<T>): RealtimeChannel {
  const supabase = createClient()
  const channel = supabase.channel(`${table}_changes`)
  
  const config = {
    event: '*' as const,
    schema: 'public',
    table,
    ...(filter ? { filter } : {})
  }

  return channel
    .on('postgres_changes', config, (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload
      
      switch (eventType) {
        case 'INSERT':
          callbacks.onInsert?.(newRecord as T)
          break
        case 'UPDATE':
          callbacks.onUpdate?.(newRecord as T)
          break
        case 'DELETE':
          callbacks.onDelete?.(oldRecord as T)
          break
      }
    })
    .subscribe()
}

/**
 * Creates a subscription to channel changes
 */
export function subscribeToChannels({
  callbacks
}: {
  callbacks: SubscriptionCallbacks<Channel>
}): RealtimeChannel {
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
}: SubscribeToChannelMessagesProps): RealtimeChannel {
  return createTableSubscription<ChannelMessage>({
    table: 'channel_messages',
    filter: `channel_id=eq.${channelId}`,
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
}: SubscribeToDirectMessagesProps): RealtimeChannel {
  return createTableSubscription<DirectMessage>({
    table: 'direct_messages',
    filter: `or(and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId}))`,
    callbacks
  })
}

/**
 * Creates a subscription to thread messages for a parent message
 */
export function subscribeToThreadMessages({
  parentId,
  parentType,
  callbacks
}: SubscribeToThreadMessagesProps): RealtimeChannel {
  return createTableSubscription<ThreadMessage>({
    table: 'thread_messages',
    filter: `and(parent_id.eq.${parentId},parent_type.eq.${parentType})`,
    callbacks
  })
}

/**
 * Creates a subscription to emoji reactions for a message
 */
export function subscribeToReactions({
  messageId,
  messageType,
  callbacks
}: SubscribeToReactionsProps): RealtimeChannel {
  return createTableSubscription<EmojiReaction>({
    table: 'emoji_reactions',
    filter: `and(parent_id.eq.${messageId},parent_type.eq.${messageType})`,
    callbacks
  })
}

/**
 * Creates a subscription to user status changes
 */
export function subscribeToUserStatus({
  userIds,
  callbacks
}: SubscribeToUserStatusProps): RealtimeChannel {
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
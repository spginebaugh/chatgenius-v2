"use client"

import type { RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js'
import type { DbMessage, MessageReaction } from '@/types/database'
import type { SubscriptionContext, SubscriptionRefs, MessageType } from './types'
import { createClient } from '@/lib/supabase/client'
import { convertToUiMessage } from './message-converter'
import { formatReactions } from '@/lib/stores/messages/utils'

const supabase = createClient()

interface SubscriptionConfig {
  channelPrefix: string
  table: string
  filter: string
}

interface MessageHandlers {
  onNewMessage?: (message: DbMessage) => void
  onMessageDelete?: (message: DbMessage) => void
  addMessage: (type: MessageType, key: string | number, message: any) => void
  deleteMessage: (type: MessageType, key: string | number, messageId: number) => void
}

interface ReactionHandlers {
  onReactionUpdate?: (messageId: number, reactions: MessageReaction[]) => void
  updateReactions: (type: MessageType, key: string | number, messageId: number, reactions: MessageReaction[]) => void
}

function createSubscriptionConfig(messageType: MessageType, messageKey: string | number): SubscriptionConfig {
  // Special handling for thread type
  if (messageType === 'threads') {
    return {
      channelPrefix: `messages-thread-${messageKey}`,
      table: 'messages',
      filter: `parent_message_id=eq.${messageKey}`
    }
  }

  // Handle DMs - use message_type and participant filtering
  if (messageType === 'dms') {
    return {
      channelPrefix: `messages-dm-${messageKey}`,
      table: 'messages',
      // messageKey here is the receiver_id
      filter: `message_type=eq.direct&or=(sender_id.eq.${messageKey},receiver_id.eq.${messageKey})`
    }
  }

  // Handle channels - use channel_id and message_type
  return {
    channelPrefix: `messages-channel-${messageKey}`,
    table: 'messages',
    filter: `channel_id=eq.${messageKey}&message_type=eq.channel`
  }
}

function createReactionSubscriptionConfig(messageType: MessageType, messageKey: string | number): SubscriptionConfig {
  // Special handling for thread type
  if (messageType === 'threads') {
    return {
      channelPrefix: `reactions-thread-${messageKey}`,
      table: 'message_reactions',
      filter: `message_id=in.(select id from messages where parent_message_id=${messageKey})`
    }
  }

  // Handle DMs - filter reactions on direct messages
  if (messageType === 'dms') {
    return {
      channelPrefix: `reactions-dm-${messageKey}`,
      table: 'message_reactions',
      // messageKey here is the receiver_id
      filter: `message_id=in.(select id from messages where message_type=eq.direct and (sender_id=${messageKey} or receiver_id=${messageKey}))`
    }
  }

  // Handle channels - filter reactions on channel messages
  return {
    channelPrefix: `reactions-channel-${messageKey}`,
    table: 'message_reactions',
    filter: `message_id=in.(select id from messages where channel_id=${messageKey} and message_type=eq.channel)`
  }
}

async function handleMessageEvent(
  payload: RealtimePostgresChangesPayload<DbMessage>,
  context: SubscriptionContext,
  handlers: MessageHandlers
) {
  const { eventType } = payload

  if (eventType === 'DELETE' && payload.old) {
    const message = payload.old as DbMessage
    handlers.deleteMessage(context.messageType, context.storeKey, message.message_id)
    handlers.onMessageDelete?.(message)
    return
  }

  if (eventType === 'INSERT' && payload.new) {
    const message = await convertToUiMessage(payload.new as DbMessage, context.currentUserId)
    handlers.addMessage(context.messageType, context.storeKey, message)
    handlers.onNewMessage?.(payload.new as DbMessage)
  }
}

async function handleReactionEvent(
  payload: RealtimePostgresChangesPayload<MessageReaction>,
  context: SubscriptionContext,
  handlers: ReactionHandlers
) {
  const reactionData = payload.new as MessageReaction | null
  if (!reactionData?.message_id) return

  const { data: reactions } = await supabase
    .from('message_reactions')
    .select('*')
    .eq('message_id', reactionData.message_id)

  if (reactions) {
    const formattedReactions = formatReactions(reactions as MessageReaction[], context.currentUserId)
    handlers.updateReactions(context.messageType, context.storeKey, reactionData.message_id, reactions as MessageReaction[])
    handlers.onReactionUpdate?.(reactionData.message_id, reactions as MessageReaction[])
  }
}

function setupSubscription<T extends { [key: string]: any }>({
  config,
  handlers,
  context,
  handleEvent
}: {
  config: SubscriptionConfig
  handlers: MessageHandlers | ReactionHandlers
  context: SubscriptionContext
  handleEvent: (payload: RealtimePostgresChangesPayload<T>, context: SubscriptionContext, handlers: any) => Promise<void>
}) {
  // Generate a stable channel ID based on config
  const channelId = `${config.channelPrefix}-${config.table}-${config.filter}`

  console.debug('[Realtime] Setting up subscription:', {
    channelId,
    table: config.table,
    filter: config.filter,
    messageType: context.messageType,
    storeKey: context.storeKey
  })

  // Create the channel
  const channel = (supabase as SupabaseClient)
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: config.table,
        filter: config.filter
      },
      async (payload: RealtimePostgresChangesPayload<T>) => {
        console.debug('[Realtime] Received event:', {
          type: payload.eventType,
          table: config.table,
          new: payload.new,
          old: payload.old
        })
        await handleEvent(payload, context, handlers)
      }
    )

  const subscription = channel.subscribe((status) => {
    console.debug('[Realtime] Subscription status:', {
      channelId,
      status,
      table: config.table
    })
  })

  return channel
}

export function setupMessageSubscription({
  context,
  refs,
  messageKey,
  messageType,
  ...handlers
}: {
  context: SubscriptionContext
  refs: SubscriptionRefs
  messageKey: string | number
  messageType: MessageType
} & MessageHandlers) {
  console.debug('[Realtime] Setting up message subscription:', {
    messageType,
    messageKey,
    context
  })

  const config = createSubscriptionConfig(messageType, messageKey)
  refs.messageRef.current = setupSubscription<DbMessage>({
    config,
    handlers,
    context,
    handleEvent: handleMessageEvent
  })
}

export function setupReactionSubscription({
  context,
  refs,
  messageKey,
  messageType,
  ...handlers
}: {
  context: SubscriptionContext
  refs: SubscriptionRefs
  messageKey: string | number
  messageType: MessageType
} & ReactionHandlers) {
  console.debug('[Realtime] Setting up reaction subscription:', {
    messageType,
    messageKey,
    context
  })

  const config = createReactionSubscriptionConfig(messageType, messageKey)
  refs.reactionRef.current = setupSubscription<MessageReaction>({
    config,
    handlers,
    context,
    handleEvent: handleReactionEvent
  })
} 
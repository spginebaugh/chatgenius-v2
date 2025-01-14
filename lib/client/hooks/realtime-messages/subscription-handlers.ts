import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { DbMessage, MessageReaction } from '@/types/database'
import type { UiMessage } from '@/types/messages-ui'
import type { SubscriptionContext, SubscriptionRefs, MessageReactionPayload } from './types'
import { createClient } from '@/lib/supabase/client'
import { fetchFullMessage, formatMessageForUi, isMessageInContext } from './message-utils'

const supabase = createClient()

export function cleanupSubscriptions(refs: SubscriptionRefs) {
  if (refs.messageRef.current) {
    refs.messageRef.current.unsubscribe()
    refs.messageRef.current = null
  }
  if (refs.reactionRef.current) {
    refs.reactionRef.current.unsubscribe()
    refs.reactionRef.current = null
  }
}

async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    console.error('No user found:', error)
    return null
  }
  return user
}

function buildMessageFilter({
  channelId,
  receiverId,
  parentMessageId,
  userId
}: {
  channelId?: number
  receiverId?: string
  parentMessageId?: number
  userId: string
}): string {
  if (channelId) {
    return `channel_id=eq.${channelId}`
  }
  if (receiverId) {
    return `message_type=eq.direct&or=(and(user_id.eq.${userId},receiver_id.eq.${receiverId}),and(user_id.eq.${receiverId},receiver_id.eq.${userId}))`
  }
  if (parentMessageId) {
    return `parent_message_id=eq.${parentMessageId}`
  }
  throw new Error('No valid filter parameters provided')
}

function determineMessageContext({
  channelId,
  receiverId,
  parentMessageId
}: {
  channelId?: number
  receiverId?: string
  parentMessageId?: number
}): { messageType: 'channels' | 'dms' | 'threads'; storeKey: string | number } {
  if (channelId) {
    return { messageType: 'channels', storeKey: channelId }
  }
  if (receiverId) {
    return { messageType: 'dms', storeKey: receiverId }
  }
  if (parentMessageId) {
    return { messageType: 'threads', storeKey: parentMessageId }
  }
  throw new Error('No valid context parameters provided')
}

export async function initializeSubscriptionContext({
  channelId,
  receiverId,
  parentMessageId,
  refs
}: {
  channelId?: number
  receiverId?: string
  parentMessageId?: number
  refs: SubscriptionRefs
}): Promise<SubscriptionContext | null> {
  const user = await getCurrentUser()
  if (!user) return null
  
  refs.currentUserIdRef.current = user.id

  try {
    const { messageType, storeKey } = determineMessageContext({ channelId, receiverId, parentMessageId })
    const messageFilter = buildMessageFilter({ channelId, receiverId, parentMessageId, userId: user.id })

    return { 
      messageType, 
      storeKey, 
      messageFilter, 
      currentUserId: user.id,
      channelId,
      receiverId,
      parentMessageId
    }
  } catch (error) {
    console.error('Error initializing subscription context:', error)
    return null
  }
}

async function handleMessageChange(
  payload: RealtimePostgresChangesPayload<DbMessage>,
  context: SubscriptionContext,
  handlers: {
    addMessage: (type: 'channels' | 'dms' | 'threads', key: string | number, message: UiMessage) => void
    deleteMessage: (type: 'channels' | 'dms' | 'threads', key: string | number, messageId: number) => void
  }
) {
  const { eventType } = payload

  if (eventType === 'DELETE') {
    const oldMessage = payload.old as DbMessage
    handlers.deleteMessage(context.messageType, context.storeKey, oldMessage.id)
    return
  }

  const messageData = await fetchFullMessage(payload.new.id)
  if (!messageData) return

  const formattedMessage = formatMessageForUi(messageData)
  
  if (isMessageInContext(messageData, context)) {
    handlers.addMessage(context.messageType, context.storeKey, formattedMessage)
  }
}

export function subscribeToMessages({
  context,
  refs,
  addMessage,
  deleteMessage
}: {
  context: SubscriptionContext
  refs: SubscriptionRefs
  addMessage: (type: 'channels' | 'dms' | 'threads', key: string | number, message: UiMessage) => void
  deleteMessage: (type: 'channels' | 'dms' | 'threads', key: string | number, messageId: number) => void
}) {
  refs.messageRef.current = supabase
    .channel('messages')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: context.messageFilter
      },
      async (payload: RealtimePostgresChangesPayload<DbMessage>) => {
        await handleMessageChange(payload, context, { addMessage, deleteMessage })
      }
    )
    .subscribe()
}

async function fetchMessageReactions(messageId: number): Promise<MessageReaction[]> {
  const { data: reactions, error } = await supabase
    .from('message_reactions')
    .select('*')
    .eq('message_id', messageId)

  if (error) {
    console.error('Error fetching reactions:', error)
    return []
  }

  return reactions || []
}

async function handleReactionChange(
  payload: RealtimePostgresChangesPayload<MessageReactionPayload>,
  context: SubscriptionContext,
  updateReactions: (type: 'channels' | 'dms' | 'threads', key: string | number, messageId: number, reactions: MessageReaction[]) => void
) {
  const reactionPayload = (payload.new || payload.old) as MessageReactionPayload | undefined
  if (!reactionPayload?.message_id) {
    console.error('No message ID found in reaction payload')
    return
  }

  const reactions = await fetchMessageReactions(reactionPayload.message_id)
  updateReactions(context.messageType, context.storeKey, reactionPayload.message_id, reactions)
}

export function subscribeToReactions({
  context,
  refs,
  updateReactions
}: {
  context: SubscriptionContext
  refs: SubscriptionRefs
  updateReactions: (type: 'channels' | 'dms' | 'threads', key: string | number, messageId: number, reactions: MessageReaction[]) => void
}) {
  refs.reactionRef.current = supabase
    .channel('message_reactions')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
        filter: context.messageFilter
      },
      async (payload: RealtimePostgresChangesPayload<MessageReactionPayload>) => {
        await handleReactionChange(payload, context, updateReactions)
      }
    )
    .subscribe()
} 
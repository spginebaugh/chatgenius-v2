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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('No user found')
    return null
  }
  refs.currentUserIdRef.current = user.id

  let messageFilter = ''
  let messageType: 'channels' | 'dms' | 'threads' = 'channels'
  let storeKey: string | number = ''

  if (channelId) {
    messageFilter = `channel_id=eq.${channelId}`
    messageType = 'channels'
    storeKey = channelId
  } else if (receiverId) {
    messageFilter = `message_type=eq.direct&or=(and(user_id.eq.${user.id},receiver_id.eq.${receiverId}),and(user_id.eq.${receiverId},receiver_id.eq.${user.id}))`
    messageType = 'dms'
    storeKey = receiverId
  } else if (parentMessageId) {
    messageFilter = `parent_message_id=eq.${parentMessageId}`
    messageType = 'threads'
    storeKey = parentMessageId
  } else {
    console.error('No valid subscription parameters provided')
    return null
  }

  return { 
    messageType, 
    storeKey, 
    messageFilter, 
    currentUserId: user.id,
    channelId,
    receiverId,
    parentMessageId
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
        const { eventType } = payload

        if (eventType === 'DELETE') {
          const oldMessage = payload.old as DbMessage
          deleteMessage(context.messageType, context.storeKey, oldMessage.id)
          return
        }

        const messageData = await fetchFullMessage(payload.new.id)
        if (!messageData) return

        const formattedMessage = formatMessageForUi(messageData)
        
        if (isMessageInContext(messageData, context)) {
          addMessage(context.messageType, context.storeKey, formattedMessage)
        }
      }
    )
    .subscribe()
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
        const reactionPayload = (payload.new || payload.old) as MessageReactionPayload | undefined
        if (!reactionPayload?.message_id) {
          console.error('No message ID found in reaction payload')
          return
        }

        const { data: reactions, error: reactionsError } = await supabase
          .from('message_reactions')
          .select('*')
          .eq('message_id', reactionPayload.message_id)

        if (reactionsError) {
          console.error('Error fetching reactions:', reactionsError)
          return
        }

        updateReactions(context.messageType, context.storeKey, reactionPayload.message_id, reactions || [])
      }
    )
    .subscribe()
} 
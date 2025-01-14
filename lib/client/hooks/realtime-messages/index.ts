"use client"

import { useEffect, useRef } from 'react'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useMessagesStore } from '@/lib/stores/messages/index'
import type { UseRealtimeMessagesParams, SubscriptionContext } from './types'
import { cleanupSubscriptions, initializeSubscriptionContext } from './subscription-handlers'
import { formatReactions } from '@/lib/stores/messages/utils'
import type { MessageReaction, DbMessage } from '@/types/database'
import type { UiMessage } from '@/types/messages-ui'
import { createClient } from '@/lib/supabase/client'

export function useRealtimeMessages({
  channelId,
  receiverId,
  parentMessageId,
  onNewMessage,
  onMessageDelete,
  onMessageUpdate,
  onReactionUpdate
}: UseRealtimeMessagesParams) {
  const messageSubscriptionRef = useRef<RealtimeChannel | null>(null)
  const reactionSubscriptionRef = useRef<RealtimeChannel | null>(null)
  const currentUserIdRef = useRef<string | null>(null)
  
  const { addMessage, updateReactions, deleteMessage } = useMessagesStore()
  const supabase = createClient()

  const convertToUiMessage = async (dbMessage: DbMessage): Promise<UiMessage> => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', dbMessage.user_id)
      .single()

    return {
      ...dbMessage,
      profiles: profile || {
        id: dbMessage.user_id,
        username: 'Unknown User',
        status: 'OFFLINE'
      },
      reactions: [],
      files: [],
      thread_messages: []
    }
  }

  useEffect(() => {
    const refs = {
      messageRef: messageSubscriptionRef,
      reactionRef: reactionSubscriptionRef,
      currentUserIdRef
    }

    const setupSubscriptions = async () => {
      cleanupSubscriptions(refs)
      const context = await initializeSubscriptionContext({
        channelId,
        receiverId,
        parentMessageId,
        refs
      })
      if (!context) return

      // Subscribe to messages
      const { messageType, storeKey: messageKey, currentUserId } = context
      
      messageSubscriptionRef.current = supabase
        .channel(`messages-${messageKey}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `${messageType}_id=eq.${messageKey}`
        }, async (payload: RealtimePostgresChangesPayload<DbMessage>) => {
          if (payload.new && 'id' in payload.new) {
            const message = await convertToUiMessage(payload.new as DbMessage)
            addMessage(messageType, messageKey, message)
            onNewMessage?.(payload.new as DbMessage)
          }
        })
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `${messageType}_id=eq.${messageKey}`
        }, (payload: RealtimePostgresChangesPayload<DbMessage>) => {
          if (payload.old && 'id' in payload.old) {
            const message = payload.old as DbMessage
            deleteMessage(messageType, messageKey, message.id)
            onMessageDelete?.(message)
          }
        })
        .subscribe()

      // Subscribe to reactions
      reactionSubscriptionRef.current = supabase
        .channel(`reactions-${messageKey}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=in.(select id from messages where ${messageType}_id=${messageKey})`
        }, async (payload: RealtimePostgresChangesPayload<MessageReaction>) => {
          if (payload.new && 'message_id' in payload.new) {
            const { data: reactions } = await supabase
              .from('message_reactions')
              .select('*')
              .eq('message_id', payload.new.message_id)

            if (reactions) {
              const formattedReactions = formatReactions(reactions as MessageReaction[], currentUserId)
              updateReactions(messageType, messageKey, payload.new.message_id, formattedReactions)
              onReactionUpdate?.(payload.new.message_id, reactions as MessageReaction[])
            }
          }
        })
        .subscribe()
    }

    setupSubscriptions().catch(error => {
      console.error('Error setting up subscriptions:', error)
    })

    return () => cleanupSubscriptions(refs)
  }, [channelId, receiverId, parentMessageId, addMessage, updateReactions, deleteMessage, onNewMessage, onMessageDelete, onReactionUpdate])
}

// Re-export types
export * from './types' 
"use client"

import { useEffect, useRef } from 'react'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useMessagesStore } from '@/lib/stores/messages/index'
import type { UseRealtimeMessagesParams, SubscriptionContext } from './types'
import { cleanupSubscriptions, initializeSubscriptionContext } from './subscription-handlers'
import { formatReactions } from '@/lib/stores/messages/utils'
import type { MessageReaction, DbMessage, UserStatus, MessageFile } from '@/types/database'
import type { UiMessage, UiProfile } from '@/types/messages-ui'
import { createClient } from '@/lib/supabase/client'

// Helper function to create a valid UiProfile
function createUiProfile(profile: any | null, userId: string): UiProfile {
  return {
    id: profile?.id || userId,
    username: profile?.username || 'Unknown User',
    profile_picture_url: profile?.profile_picture_url || null,
    status: (profile?.status as UserStatus) || 'OFFLINE'
  }
}

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
    // Fetch the complete message with joins
    const { data: messageWithJoins } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:users!messages_user_id_fkey(
          id,
          username,
          profile_picture_url,
          status
        ),
        files:message_files(*),
        reactions:message_reactions(*)
      `)
      .eq('id', dbMessage.id)
      .single()

    if (!messageWithJoins) {
      // Fallback if joins fail
      return {
        ...dbMessage,
        message: dbMessage.message || '',
        profiles: createUiProfile(null, dbMessage.user_id),
        reactions: [],
        files: [],
        thread_messages: []
      }
    }

    // Format the message with all its relations
    return {
      ...messageWithJoins,
      message: messageWithJoins.message || '',
      profiles: createUiProfile(messageWithJoins.profiles, messageWithJoins.user_id),
      reactions: formatReactions(messageWithJoins.reactions || [], currentUserIdRef.current || ''),
      files: ((messageWithJoins.files || []) as MessageFile[]).map(file => ({
        url: file.file_url,
        type: file.file_type,
        name: file.file_url.split('/').pop() || 'file'
      })),
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
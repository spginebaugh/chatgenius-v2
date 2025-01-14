"use client"

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { DbMessage, MessageReaction, UserStatus } from '@/types/database'
import type { UiMessage } from '@/types/messages-ui'
import { useMessagesStore } from '@/lib/stores/messages'

interface UseRealtimeMessagesParams {
  channelId?: number
  receiverId?: string
  parentMessageId?: number
  onNewMessage?: (message: DbMessage) => void
  onMessageDelete?: (message: DbMessage) => void
  onMessageUpdate?: (message: DbMessage) => void
  onReactionUpdate?: (messageId: number, reactions: MessageReaction[]) => void
}

interface MessageReactionPayload {
  id: number
  message_id: number
  user_id: string
  emoji: string
  created_at: string
}

const supabase = createClient()

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

  useEffect(() => {
    // Clean up any existing subscriptions
    const cleanup = () => {
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current.unsubscribe()
        messageSubscriptionRef.current = null
      }
      if (reactionSubscriptionRef.current) {
        reactionSubscriptionRef.current.unsubscribe()
        reactionSubscriptionRef.current = null
      }
    }

    const setupSubscriptions = async () => {
      cleanup()

      // Get current user for DM filtering
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No user found')
        return
      }
      currentUserIdRef.current = user.id

      // Set up message subscription
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
        return
      }

      // Subscribe to messages
      messageSubscriptionRef.current = supabase
        .channel('messages')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: messageFilter
          },
          async (payload: RealtimePostgresChangesPayload<DbMessage>) => {
            const { eventType } = payload

            if (eventType === 'DELETE') {
              const oldMessage = payload.old as DbMessage
              deleteMessage(messageType, storeKey, oldMessage.id)
              return
            }

            // For INSERT and UPDATE, fetch the full message with profiles
            const { data: messageData, error: messageError } = await supabase
              .from('messages')
              .select(`
                *,
                profiles:user_id(
                  id,
                  username,
                  profile_picture_url,
                  status
                ),
                reactions:message_reactions(*),
                thread_messages:messages!parent_message_id(
                  *,
                  profiles:user_id(
                    id,
                    username,
                    profile_picture_url,
                    status
                  )
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (messageError) {
              console.error('Error fetching message:', messageError)
              return
            }

            if (!messageData) {
              console.error('No message data found')
              return
            }

            // Format message for UI with proper profile handling
            const formattedMessage: UiMessage = {
              ...messageData,
              profiles: messageData.profiles || {
                id: messageData.user_id,
                username: 'Unknown'
              },
              reactions: messageData.reactions || [],
              thread_messages: messageData.thread_messages?.map((threadMsg: DbMessage & { profiles?: { id: string; username: string | null; profile_picture_url?: string | null; status?: UserStatus } }) => {
                const threadProfiles = threadMsg.profiles || {
                  id: threadMsg.user_id,
                  username: 'Unknown',
                  profile_picture_url: null,
                  status: 'OFFLINE' as const
                }
                
                return {
                  ...threadMsg,
                  profiles: threadProfiles,
                  reactions: [],
                  thread_count: 0
                }
              }) || []
            }

            // Only add message if it belongs to the current context
            if (
              (channelId && messageData.channel_id === channelId) ||
              (receiverId && currentUserIdRef.current && (
                (messageData.user_id === receiverId && messageData.receiver_id === currentUserIdRef.current) ||
                (messageData.user_id === currentUserIdRef.current && messageData.receiver_id === receiverId)
              )) ||
              (parentMessageId && messageData.parent_message_id === parentMessageId)
            ) {
              addMessage(messageType, storeKey, formattedMessage)
            }
          }
        )
        .subscribe()

      // Subscribe to reactions
      reactionSubscriptionRef.current = supabase
        .channel('message_reactions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_reactions',
            filter: messageFilter
          },
          async (payload: RealtimePostgresChangesPayload<MessageReactionPayload>) => {
            const reactionPayload = (payload.new || payload.old) as MessageReactionPayload | undefined
            if (!reactionPayload?.message_id) {
              console.error('No message ID found in reaction payload')
              return
            }

            // Fetch all reactions for this message
            const { data: reactions, error: reactionsError } = await supabase
              .from('message_reactions')
              .select('*')
              .eq('message_id', reactionPayload.message_id)

            if (reactionsError) {
              console.error('Error fetching reactions:', reactionsError)
              return
            }

            // Update reactions in store
            updateReactions(messageType, storeKey, reactionPayload.message_id, reactions || [])
          }
        )
        .subscribe()
    }

    setupSubscriptions().catch(error => {
      console.error('Error setting up subscriptions:', error)
    })

    return cleanup
  }, [channelId, receiverId, parentMessageId, addMessage, updateReactions, deleteMessage])
} 
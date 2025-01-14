"use client"

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMessagesStore } from '@/lib/stores/messages'
import { useRealtimeMessages } from '@/lib/client/hooks/use-realtime-messages'
import type { UiMessage } from '@/types/messages-ui'
import type { DbMessage } from '@/types/database'

interface ChatClientFetchProps {
  currentUser: { id: string }
  currentChannelId?: number
  currentDmUserId?: string
  parentMessageId?: number
}

const supabase = createClient()

export function ChatClientFetch({
  currentUser,
  currentChannelId,
  currentDmUserId,
  parentMessageId
}: ChatClientFetchProps) {
  const { setMessages } = useMessagesStore()

  // Set up real-time subscriptions
  useRealtimeMessages({
    channelId: currentChannelId,
    receiverId: currentDmUserId,
    parentMessageId
  })

  // Initial fetch of messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentUser?.id) {
        console.error('No user found')
        return
      }

      let messageType: 'channels' | 'dms' | 'threads' = 'channels'
      let storeKey: string | number = ''
      let query = supabase
        .from('messages')
        .select(`
          *,
          profiles:user_id(*),
          reactions:message_reactions(*),
          files:message_files(*),
          thread_messages:messages!parent_message_id(
            *,
            profiles:user_id(*),
            files:message_files(*)
          )
        `)

      if (currentChannelId) {
        query = query.eq('channel_id', currentChannelId)
        messageType = 'channels'
        storeKey = currentChannelId
      } else if (currentDmUserId) {
        query = query
          .eq('message_type', 'direct')
          .or(`and(user_id.eq.${currentUser.id},receiver_id.eq.${currentDmUserId}),and(user_id.eq.${currentDmUserId},receiver_id.eq.${currentUser.id})`)
        messageType = 'dms'
        storeKey = currentDmUserId
      } else if (parentMessageId) {
        query = query.eq('parent_message_id', parentMessageId)
        messageType = 'threads'
        storeKey = parentMessageId
      } else {
        console.error('No valid query parameters provided')
        return
      }

      const { data: messages, error } = await query.order('inserted_at', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
        return
      }

      if (!messages) {
        console.error('No messages found')
        return
      }

      // Format messages for UI
      const formattedMessages: UiMessage[] = messages.map(message => ({
        ...message,
        profiles: message.profiles || {
          id: message.user_id,
          username: 'Unknown'
        },
        files: message.files || [],
        reactions: message.reactions || [],
        thread_messages: message.thread_messages?.map((threadMsg: { user_id: string }) => ({
          ...threadMsg,
          profiles: {
            id: threadMsg.user_id,
            username: 'Unknown'
          },
          files: [],
          reactions: []
        })) || []
      }))

      // Set messages in store
      setMessages(messageType, storeKey, formattedMessages)
    }

    fetchMessages().catch(error => {
      console.error('Error in fetchMessages:', error)
    })
  }, [currentUser?.id, currentChannelId, currentDmUserId, parentMessageId, setMessages])

  return null
} 
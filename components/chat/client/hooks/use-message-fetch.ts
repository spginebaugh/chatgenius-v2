import { useEffect } from 'react'
import { useMessagesStore } from '@/lib/stores/messages/index'
import { useRealtimeMessages } from '@/lib/client/hooks/realtime-messages'
import { configureQueryParams } from '../utils/query-builder'
import { fetchAndFormatMessages } from '../utils/message-formatter'
import type { ChatClientFetchProps } from '../types'

export function useMessageFetch({
  currentUser,
  currentChannelId,
  currentDmUserId,
  parentMessageId,
  skipInitialFetch = false,
  initialMessages
}: ChatClientFetchProps) {
  const { setMessages } = useMessagesStore()

  // Set initial messages from server if provided
  useEffect(() => {
    if (initialMessages && (currentChannelId || currentDmUserId)) {
      const messageType = currentChannelId ? 'channels' : 'dms'
      const storeKey = currentChannelId || currentDmUserId
      if (storeKey) {
        setMessages(messageType, storeKey, initialMessages)
      }
    }
  }, [initialMessages, currentChannelId, currentDmUserId, setMessages])

  useRealtimeMessages({
    channelId: currentChannelId,
    receiverId: currentDmUserId,
    parentMessageId
  })

  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentUser?.id) {
        console.error('No user found')
        return
      }

      const queryConfig = configureQueryParams({
        currentUser,
        currentChannelId,
        currentDmUserId,
        parentMessageId,
        skipInitialFetch
      })

      if (!queryConfig) {
        // If skipInitialFetch is true and we have initial messages, this is expected
        if (skipInitialFetch && initialMessages) return
        console.error('No valid query parameters provided')
        return
      }

      try {
        const formattedMessages = await fetchAndFormatMessages(queryConfig, currentUser.id)
        setMessages(queryConfig.messageType, queryConfig.storeKey, formattedMessages)
      } catch (error) {
        console.error('Error in fetchMessages:', error)
      }
    }

    fetchMessages()
  }, [currentUser?.id, currentChannelId, currentDmUserId, parentMessageId, setMessages, skipInitialFetch, initialMessages])
} 
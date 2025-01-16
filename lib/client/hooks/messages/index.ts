"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatMessage } from './format-utils'
import { fetchCurrentUser, fetchMessagesData } from './query-utils'
import type { UseMessagesProps, UseMessagesResult } from './types'
import type { UserStatus, MessageFile } from '@/types/database'

export function useMessages({ 
  channelId,
  receiverId,
  parentMessageId,
  initialMessages = []
}: UseMessagesProps = {}): UseMessagesResult {
  const [messages, setMessages] = useState(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoading(true)
        const supabase = createClient()

        const [currentUser, messagesData] = await Promise.all([
          fetchCurrentUser(supabase),
          fetchMessagesData({ channelId, receiverId, parentMessageId, supabase })
        ])

        const formattedMessages = messagesData.map(msg => {
          const messageWithProfile = {
            ...msg,
            profiles: Array.isArray(msg.profiles) && msg.profiles[0] ? {
              user_id: String(msg.profiles[0].user_id),
              username: msg.profiles[0].username,
              profile_picture_url: null,
              status: 'OFFLINE' as UserStatus
            } : undefined,
            files: (msg.message_files || []).map(file => ({
              ...file,
              message_id: msg.message_id,
              vector_status: 'completed',
              inserted_at: msg.inserted_at
            })) as MessageFile[]
          }
          return formatMessage({ message: messageWithProfile, currentUserId: currentUser.id })
        })

        setMessages(formattedMessages)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch messages'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchMessages()
  }, [channelId, receiverId, parentMessageId])

  return {
    messages,
    isLoading,
    error
  }
}

// Re-export everything for convenience
export * from './types'
export * from './format-utils'
export * from './query-utils' 
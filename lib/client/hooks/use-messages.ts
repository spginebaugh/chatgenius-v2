"use client"

import { useEffect, useState } from 'react'
import type { DbMessage, MessageReaction } from '@/types/database'
import type { UiMessage } from '@/types/messages-ui'
import { createClient } from '@/lib/supabase/client'

interface UseMessagesProps {
  channelId?: number
  receiverId?: string
  parentMessageId?: number
  initialMessages?: UiMessage[]
}

interface UseMessagesResult {
  messages: UiMessage[]
  isLoading: boolean
  error: Error | null
}

interface FormattedReaction {
  emoji: string
  count: number
  reacted_by_me: boolean
}

export function useMessages({ 
  channelId,
  receiverId,
  parentMessageId,
  initialMessages = []
}: UseMessagesProps = {}): UseMessagesResult {
  const [messages, setMessages] = useState<UiMessage[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchMessages = async () => {
      if (!channelId && !receiverId && !parentMessageId) return

      try {
        setIsLoading(true)
        
        const supabase = createClient()
        let query = supabase
          .from('messages')
          .select(`
            *,
            user:users(id, username),
            reactions:message_reactions(
              id,
              message_id,
              user_id,
              emoji,
              inserted_at
            )
          `)

        if (channelId) query = query.eq('channel_id', channelId)
        if (receiverId) query = query.eq('receiver_id', receiverId)
        if (parentMessageId) query = query.eq('parent_message_id', parentMessageId)

        const { data: messagesData, error: queryError } = await query

        if (queryError) throw queryError
        if (!messagesData) throw new Error('No data returned')

        // Get current user for reaction formatting
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('No user found')

        // Format messages with reactions
        const formattedMessages = messagesData.map(msg => ({
          ...msg,
          reactions: msg.reactions ? msg.reactions.reduce((acc: Record<string, FormattedReaction>, r: MessageReaction) => {
            if (!acc[r.emoji]) {
              acc[r.emoji] = {
                emoji: r.emoji,
                count: 0,
                reacted_by_me: false
              }
            }
            acc[r.emoji].count++
            if (r.user_id === user.id) {
              acc[r.emoji].reacted_by_me = true
            }
            return acc
          }, {}) : {}
        }))

        // Convert reaction objects to arrays
        const finalMessages = formattedMessages.map(msg => ({
          ...msg,
          reactions: Object.values(msg.reactions || {})
        }))

        setMessages(finalMessages)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch messages'))
      } finally {
        setIsLoading(false)
      }
    }

    if (initialMessages.length === 0) {
      fetchMessages()
    }
  }, [channelId, receiverId, parentMessageId, initialMessages])

  return {
    messages,
    isLoading,
    error
  }
} 
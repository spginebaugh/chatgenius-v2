"use client"

import { useEffect, useState } from 'react'
import type { DbMessage, MessageReaction, UserStatus } from '@/types/database'
import type { UiMessage, UiProfile } from '@/types/messages-ui'
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

interface MessageQueryParams {
  channelId?: number
  receiverId?: string
  parentMessageId?: number
}

interface FormatMessageParams {
  message: DbMessage & {
    reactions?: MessageReaction[]
    user?: { id: string; username: string }
  }
  currentUserId: string
}

function buildMessageQuery(supabase: ReturnType<typeof createClient>, params: MessageQueryParams) {
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

  if (params.channelId) query = query.eq('channel_id', params.channelId)
  if (params.receiverId) query = query.eq('receiver_id', params.receiverId)
  if (params.parentMessageId) query = query.eq('parent_message_id', params.parentMessageId)

  return query
}

function formatReactions(reactions: MessageReaction[] = [], currentUserId: string): FormattedReaction[] {
  const reactionMap = reactions.reduce((acc: Record<string, FormattedReaction>, r: MessageReaction) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = {
        emoji: r.emoji,
        count: 0,
        reacted_by_me: false
      }
    }
    acc[r.emoji].count++
    if (r.user_id === currentUserId) {
      acc[r.emoji].reacted_by_me = true
    }
    return acc
  }, {})

  return Object.values(reactionMap)
}

function formatMessage({ message, currentUserId }: FormatMessageParams): UiMessage {
  return {
    ...message,
    message: message.message || '',
    profiles: {
      id: message.user?.id || message.user_id,
      username: message.user?.username || 'Unknown',
      profile_picture_url: null,
      status: 'OFFLINE'
    },
    reactions: formatReactions(message.reactions, currentUserId),
    files: [],
    thread_messages: [],
    thread_count: 0
  }
}

async function fetchCurrentUser(supabase: ReturnType<typeof createClient>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) throw new Error('No user found')
  return user
}

async function fetchMessagesData({
  channelId,
  receiverId,
  parentMessageId,
  supabase
}: MessageQueryParams & {
  supabase: ReturnType<typeof createClient>
}) {
  if (!channelId && !receiverId && !parentMessageId) return []

  const query = buildMessageQuery(supabase, { channelId, receiverId, parentMessageId })
  const { data: messagesData, error: queryError } = await query

  if (queryError) throw queryError
  if (!messagesData) throw new Error('No data returned')

  return messagesData
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
      try {
        setIsLoading(true)
        const supabase = createClient()

        const [currentUser, messagesData] = await Promise.all([
          fetchCurrentUser(supabase),
          fetchMessagesData({ channelId, receiverId, parentMessageId, supabase })
        ])

        const formattedMessages = messagesData.map(msg => 
          formatMessage({ message: msg, currentUserId: currentUser.id })
        )

        setMessages(formattedMessages)
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
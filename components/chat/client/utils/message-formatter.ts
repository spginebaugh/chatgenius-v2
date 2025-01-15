import type { MessageReaction, UserStatus } from '@/types/database'
import type { UiMessage } from '@/types/messages-ui'
import type { RawMessage, QueryConfig } from '../types'

export function formatMessageForUi(message: RawMessage, currentUserId: string): UiMessage {
  const baseMessage: UiMessage = {
    id: message.id,
    message: message.message || '',
    message_type: message.message_type,
    user_id: message.user_id,
    channel_id: message.channel_id || 0,
    receiver_id: message.receiver_id || '',
    parent_message_id: message.parent_message_id,
    inserted_at: message.inserted_at,
    thread_count: message.thread_count,
    profiles: message.profiles || {
      id: message.user_id,
      username: 'Unknown',
      status: 'offline' as UserStatus,
      profile_picture_url: null
    },
    files: message.files || [],
    reactions: message.reactions?.map((reaction: MessageReaction) => ({
      emoji: reaction.emoji,
      count: 1,
      reacted_by_me: reaction.user_id === currentUserId
    })) || [],
    thread_messages: message.thread_messages?.map((threadMsg) => ({
      ...threadMsg,
      message: threadMsg.message || '',
      channel_id: threadMsg.channel_id || 0,
      receiver_id: threadMsg.receiver_id || '',
      thread_count: threadMsg.thread_count,
      profiles: threadMsg.profiles || {
        id: threadMsg.user_id,
        username: 'Unknown',
        status: 'offline' as UserStatus,
        profile_picture_url: null
      },
      files: threadMsg.files || [],
      reactions: []
    })) || []
  }

  return baseMessage
}

export async function fetchAndFormatMessages(queryConfig: QueryConfig, currentUserId: string) {
  const { query } = queryConfig
  const { data: messages, error } = await query.order('inserted_at', { ascending: true })

  if (error) {
    throw new Error(`Error fetching messages: ${error.message}`)
  }

  if (!messages) {
    return []
  }

  return messages.map((message: RawMessage) => formatMessageForUi(message, currentUserId))
} 
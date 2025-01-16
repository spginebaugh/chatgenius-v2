import { UiMessage } from "@/types/messages-ui"
import { MessageWithJoins } from "@/lib/client/hooks/messages/format-utils"
import { formatReactions } from "@/lib/stores/messages/utils"
import { FileType } from "@/types/database"
import type { RawMessage, QueryConfig } from '../types'

interface FileInfo {
  file_id: number
  file_type: FileType
  file_url: string
}

export function formatMessageForClient(message: MessageWithJoins, currentUserId: string): UiMessage {
  return {
    message_id: message.message_id,
    message: message.message || '',
    message_type: message.message_type,
    user_id: message.profiles?.user_id || message.user_id,
    channel_id: message.channel_id,
    receiver_id: message.receiver_id,
    parent_message_id: message.parent_message_id,
    thread_count: message.thread_count,
    inserted_at: message.inserted_at,
    profiles: {
      user_id: message.profiles?.user_id || message.user_id,
      username: message.profiles?.username || 'Unknown',
      profile_picture_url: message.profiles?.profile_picture_url || null,
      status: message.profiles?.status || 'OFFLINE'
    },
    files: message.files?.map((file: FileInfo) => ({
      url: file.file_url,
      type: file.file_type,
      name: file.file_url.split('/').pop() || 'file'
    })) || [],
    reactions: formatReactions(message.reactions || [], currentUserId)
  }
}

export function formatMessagesForClient(messages: RawMessage[], currentUserId: string, queryConfig: QueryConfig) {
  if (!messages.length) {
    return []
  }

  return messages.map((message: RawMessage) => {
    const messageWithJoins: MessageWithJoins = {
      message_id: message.message_id,
      message: message.message || '',
      message_type: message.message_type,
      user_id: message.user_id,
      channel_id: message.channel_id,
      receiver_id: message.receiver_id,
      parent_message_id: message.parent_message_id,
      thread_count: message.thread_count,
      inserted_at: message.inserted_at,
      profiles: message.profiles ? {
        user_id: message.profiles.user_id,
        username: message.profiles.username || 'Unknown',
        profile_picture_url: message.profiles.profile_picture_url || null,
        status: message.profiles.status || 'OFFLINE'
      } : undefined,
      files: message.files,
      reactions: message.reactions
    }
    return formatMessageForClient(messageWithJoins, currentUserId)
  })
}

export async function fetchAndFormatMessages(queryConfig: QueryConfig, currentUserId: string) {
  const { data: messages } = await queryConfig.query
  if (!messages?.length) return []
  return formatMessagesForClient(messages, currentUserId, queryConfig)
} 
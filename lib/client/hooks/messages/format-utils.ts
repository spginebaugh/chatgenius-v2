import { MessageType, FileType, MessageReaction, DbMessage, MessageFile } from '@/types/database'
import { UiMessage } from '@/types/messages-ui'

export interface FormattedReaction {
  emoji: string
  count: number
  reacted_by_me: boolean
}

function getFileNameFromUrl(url: string): string {
  return url.split('/').pop() || 'unknown'
}

export interface FormatMessageParams {
  message: DbMessage & {
    reactions?: MessageReaction[]
    user?: { user_id: string; username: string }
    files?: MessageFile[]
  }
  currentUserId: string
}

export interface MessageWithJoins {
  message_id: number
  message: string
  message_type: MessageType
  user_id: string
  channel_id: number | null
  receiver_id: string | null
  parent_message_id: number | null
  thread_count: number
  inserted_at: string
  user?: { user_id: string; username: string }
  files?: { file_id: number; file_type: FileType; file_url: string }[]
  reactions?: MessageReaction[]
}

export function formatReactions(reactions: MessageReaction[] = [], currentUserId: string): FormattedReaction[] {
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

export function formatMessage({ message, currentUserId }: FormatMessageParams): UiMessage {
  return {
    ...message,
    message: message.message || '',
    profiles: {
      user_id: message.user?.user_id || message.user_id,
      username: message.user?.username || 'Unknown',
      profile_picture_url: null,
      status: 'OFFLINE'
    },
    reactions: formatReactions(message.reactions, currentUserId),
    files: (message.files || []).map(file => ({
      url: file.file_url,
      type: file.file_type,
      name: file.file_url.split('/').pop() || 'file'
    })),
    thread_messages: [],
    thread_count: 0
  }
}

export function formatMessageForClient(message: MessageWithJoins, currentUserId: string): UiMessage {
  return {
    message_id: message.message_id,
    message: message.message || '',
    message_type: message.message_type,
    user_id: message.user?.user_id || message.user_id,
    channel_id: message.channel_id,
    receiver_id: message.receiver_id,
    parent_message_id: message.parent_message_id,
    thread_count: message.thread_count,
    inserted_at: message.inserted_at,
    profiles: {
      user_id: message.user?.user_id || message.user_id,
      username: message.user?.username || 'Unknown',
      profile_picture_url: null,
      status: 'OFFLINE'
    },
    files: message.files?.map((file: { file_url: string; file_type: FileType }) => ({
      url: file.file_url,
      type: file.file_type,
      name: getFileNameFromUrl(file.file_url)
    })) || [],
    reactions: formatReactions(message.reactions || [], currentUserId)
  }
} 
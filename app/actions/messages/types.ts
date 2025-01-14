import type { FileAttachment } from '@/app/_lib/message-helpers'
import type { MessageType } from '@/types/database'

export interface HandleMessageProps {
  message: string
  files?: FileAttachment[]
  channelId?: number
  receiverId?: string
  parentMessageId?: number
}

export interface MessageData {
  message: string
  message_type: MessageType
  user_id: string
  channel_id?: number | null
  receiver_id?: string | null
  parent_message_id?: number | null
  thread_count: number
  inserted_at: string
}

export interface AddReactionProps {
  messageId: number
  emoji: string
} 
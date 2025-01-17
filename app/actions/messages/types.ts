import type { UiFileAttachment } from '@/types/messages-ui'
import type { MessageType } from '@/types/database'

// Request payload for sending a new message
export interface HandleMessageProps {
  message: string
  files?: UiFileAttachment[]
  channelId?: number
  receiverId?: string
  parentMessageId?: number
  isRagQuery?: boolean
  isImageGeneration?: boolean
}

// Internal message data structure for server actions
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

// Request payload for adding a reaction
export interface AddReactionProps {
  messageId: number
  emoji: string
}

// Request payload for removing a reaction
export interface RemoveReactionProps {
  messageId: number
  emoji: string
} 
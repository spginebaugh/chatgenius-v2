import { User, Channel, MessageFile, MessageReaction, UserStatus } from "@/types/database"
import { UiMessage, UiMessageReaction } from "@/types/messages-ui"

export interface FileAttachment {
  url: string
  type: 'image' | 'video' | 'audio' | 'document'
  name: string
}

// Base message type without thread_messages to avoid recursion
export interface BaseMessage extends Omit<UiMessage, 'thread_messages' | 'profiles'> {
  profiles: {
    id: string
    username: string
    profile_picture_url?: string | null
    status?: UserStatus
  }
  files?: MessageFile[]
  reactions?: UiMessageReaction[]
}

// Message type with thread messages
export interface ThreadMessage extends BaseMessage {
  thread_messages?: ThreadMessage[]
}

export interface ChatViewData {
  type: 'channel' | 'dm'
  data: Channel | User
}

export interface MessageProps {
  message: ThreadMessage
  onEmojiSelect?: (messageId: number, emoji: string) => Promise<void>
  onThreadClick?: (message: ThreadMessage) => void
} 
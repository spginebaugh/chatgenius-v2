import type { UiMessage, UiMessageReaction } from '@/types/messages-ui'
import type { MessageType } from '@/types/database'

export type MessageStoreType = MessageType

export interface MessagesState {
  messages: {
    channel: Record<string, UiMessage[]>
    direct: Record<string, UiMessage[]>
    thread: Record<string, UiMessage[]>
  }
  error: string | null
  isLoading: boolean
  
  // Store actions
  setMessages: (type: MessageStoreType, key: string | number, messages: UiMessage[]) => void
  updateReactions: (type: MessageStoreType, key: string | number, messageId: number, reactions: UiMessageReaction[]) => void
  addMessage: (type: MessageStoreType, key: string | number, message: UiMessage) => void
  addThreadMessage: (parentId: number, message: UiMessage) => void
  deleteMessage: (type: MessageStoreType, key: string | number, messageId: number) => void
  clearError: () => void
  reset: () => void
} 
import type { UiMessage } from '@/types/messages-ui'
import type { MessageReaction } from '@/types/database'

export type MessageStoreType = 'channels' | 'dms' | 'threads'

export interface MessagesState {
  messages: {
    channels: Record<string, UiMessage[]>
    dms: Record<string, UiMessage[]>
    threads: Record<string, UiMessage[]>
  }
  error: string | null
  isLoading: boolean
  setMessages: (type: MessageStoreType, key: string | number, messages: UiMessage[]) => void
  updateReactions: (type: MessageStoreType, key: string | number, messageId: number, reactions: MessageReaction[]) => void
  addMessage: (type: MessageStoreType, key: string | number, message: UiMessage) => void
  addThreadMessage: (parentId: number, message: UiMessage) => void
  deleteMessage: (type: MessageStoreType, key: string | number, messageId: number) => void
  clearError: () => void
  reset: () => void
} 
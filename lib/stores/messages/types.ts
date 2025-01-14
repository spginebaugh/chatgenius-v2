import type { UiMessage, UiMessageReaction } from '@/types/messages-ui'

export type MessageStoreType = 'channels' | 'dms' | 'threads'

export interface MessagesState {
  messages: {
    channels: Record<string, UiMessage[]>
    dms: Record<string, UiMessage[]>
    threads: Record<string, UiMessage[]>
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
import type { UiMessage } from '@/types/messages-ui'

export interface UseMessagesProps {
  channelId?: number
  receiverId?: string
  parentMessageId?: number
  initialMessages?: UiMessage[]
}

export interface UseMessagesResult {
  messages: UiMessage[]
  isLoading: boolean
  error: Error | null
} 
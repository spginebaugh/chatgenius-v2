import { DbMessage as Message } from '@/types/database'
import type { BaseUiMessage } from '@/types/messages-ui'

interface FormatBasicMessageProps {
  message: Message
}

/**
 * Formats a basic message for display without joins
 */
export function formatBasicMessage({ message }: FormatBasicMessageProps): Partial<BaseUiMessage> {
  if (!message) {
    return {
      id: 0,
      message: '',
      inserted_at: new Date().toISOString(),
    }
  }

  return {
    id: message.id || 0,
    message: message.message || '',
    inserted_at: message.inserted_at || new Date().toISOString(),
  }
} 
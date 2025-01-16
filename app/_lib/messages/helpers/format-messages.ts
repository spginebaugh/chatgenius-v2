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
      message_id: 0,
      message: '',
      inserted_at: new Date().toISOString(),
    }
  }

  return {
    message_id: message.message_id || 0,
    message: message.message || '',
    inserted_at: message.inserted_at || new Date().toISOString(),
  }
} 
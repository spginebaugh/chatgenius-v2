import { useState, useCallback } from "react"
import type { UiMessage } from "@/types/messages-ui"

export function useThreadMessageState(initialMessages: UiMessage[] = []) {
  const [threadMessages, setThreadMessages] = useState<UiMessage[]>(initialMessages)

  const addOrUpdateMessage = useCallback((formattedMessage: UiMessage) => {
    setThreadMessages(prev => {
      const exists = prev.some(m => m.message_id === formattedMessage.message_id)
      if (!exists) return [...prev, formattedMessage]
      return prev.map(m => m.message_id === formattedMessage.message_id ? formattedMessage : m)
    })
  }, [])

  const removeMessage = useCallback((messageId: number) => {
    setThreadMessages(prev => prev.filter(msg => msg.message_id !== messageId))
  }, [])

  const updateMessage = useCallback((messageId: number, formattedMessage: UiMessage) => {
    setThreadMessages(prev => prev.map(msg => 
      msg.message_id === messageId ? formattedMessage : msg
    ))
  }, [])

  return {
    threadMessages,
    addOrUpdateMessage,
    removeMessage,
    updateMessage,
    setThreadMessages
  }
} 
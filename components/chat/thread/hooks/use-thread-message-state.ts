import { useState, useCallback } from "react"
import type { UiMessage } from "@/types/messages-ui"

export function useThreadMessageState(initialMessages: UiMessage[] = []) {
  const [threadMessages, setThreadMessages] = useState<UiMessage[]>(initialMessages)

  const addMessage = useCallback((formattedMessage: UiMessage) => {
    setThreadMessages(prev => {
      const exists = prev.some(m => m.id === formattedMessage.id)
      if (exists) {
        return prev.map(m => m.id === formattedMessage.id ? formattedMessage : m)
      }
      return [...prev, formattedMessage].sort((a, b) => 
        new Date(a.inserted_at).getTime() - new Date(b.inserted_at).getTime()
      )
    })
  }, [])

  const removeMessage = useCallback((messageId: number) => {
    setThreadMessages(prev => prev.filter(msg => msg.id !== messageId))
  }, [])

  const updateMessage = useCallback((messageId: number, updatedMessage: UiMessage | ((prev: UiMessage) => UiMessage)) => {
    setThreadMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? (typeof updatedMessage === 'function' ? updatedMessage(msg) : updatedMessage)
        : msg
    ))
  }, [])

  return {
    threadMessages,
    addMessage,
    removeMessage,
    updateMessage,
    setThreadMessages
  }
} 
"use client"

import { useState, useCallback } from 'react'
import type { UiMessage } from '@/types/messages-ui'

export function useMessageState(initialMessages: UiMessage[]) {
  const [realtimeMessages, setRealtimeMessages] = useState<UiMessage[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  const addOrUpdateMessage = useCallback((formattedMessage: UiMessage) => {
    setRealtimeMessages(prev => {
      const exists = prev.some(m => m.message_id === formattedMessage.message_id)
      if (!exists) return [...prev, formattedMessage]
      return prev.map(m => m.message_id === formattedMessage.message_id ? formattedMessage : m)
    })
  }, [])

  const removeMessage = useCallback((messageId: number) => {
    setRealtimeMessages(prev => prev.filter(msg => msg.message_id !== messageId))
  }, [])

  const updateMessage = useCallback((messageId: number, formattedMessage: UiMessage) => {
    setRealtimeMessages(prev => prev.map(msg => 
      msg.message_id === messageId ? formattedMessage : msg
    ))
  }, [])

  return {
    realtimeMessages,
    setRealtimeMessages,
    isLoading,
    setIsLoading,
    error,
    setError,
    addOrUpdateMessage,
    removeMessage,
    updateMessage
  }
} 
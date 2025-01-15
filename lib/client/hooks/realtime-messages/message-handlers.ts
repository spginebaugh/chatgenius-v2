"use client"

import type { UiMessage } from "@/types/messages-ui"

export function createMessageHandlers(setMessages: React.Dispatch<React.SetStateAction<UiMessage[]>>) {
  return {
    addMessage: (type: 'channels' | 'dms' | 'threads', key: string | number, message: UiMessage) => {
      setMessages(prev => {
        const exists = prev.some(m => m.id === message.id)
        if (exists) return prev
        return [...prev, message]
      })
    },
    deleteMessage: (type: 'channels' | 'dms' | 'threads', key: string | number, messageId: number) => {
      setMessages(prev => prev.filter(m => m.id !== messageId))
    }
  }
}

export function createReactionHandlers(setMessages: React.Dispatch<React.SetStateAction<UiMessage[]>>) {
  return {
    updateReactions: (type: 'channels' | 'dms' | 'threads', key: string | number, messageId: number, reactions: any[]) => {
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, reactions } : m
      ))
    }
  }
} 
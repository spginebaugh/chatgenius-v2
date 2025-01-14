"use client"

import { create } from 'zustand'
import type { UiMessage, UiMessageReaction } from '@/types/messages-ui'
import type { MessageReaction } from '@/types/database'

type MessageStoreType = 'channels' | 'dms' | 'threads'

// Helper function to ensure consistent store keys
function getStoreKey(type: MessageStoreType, id: string | number): string {
  return `${type}:${id.toString()}`
}

interface MessagesState {
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

const initialState = {
  messages: {
    channels: {},
    dms: {},
    threads: {}
  },
  error: null,
  isLoading: false
}

export const useMessagesStore = create<MessagesState>()((set, get) => ({
  ...initialState,

  setMessages: (type, key, messages) => {
    const storeKey = getStoreKey(type, key)
    const existingMessages = get().messages[type][storeKey] || []

    // If messages array is empty and we have existing messages, preserve them
    if (messages.length === 0 && existingMessages.length > 0) {
      return
    }

    // Create a map of existing messages for efficient lookup
    const existingMessageMap = new Map(existingMessages.map(msg => [msg.id, msg]))

    // Merge new messages with existing ones
    const mergedMessages = messages.reduce((acc: UiMessage[], newMsg) => {
      const existingMsg = existingMessageMap.get(newMsg.id)
      if (existingMsg) {
        acc.push({
          ...existingMsg,
          ...newMsg,
          reactions: newMsg.reactions?.length ? newMsg.reactions : existingMsg.reactions,
          thread_messages: newMsg.thread_messages?.length ? newMsg.thread_messages : existingMsg.thread_messages,
          profiles: newMsg.profiles || existingMsg.profiles
        })
      } else {
        acc.push({
          ...newMsg,
          reactions: newMsg.reactions || [],
          thread_messages: newMsg.thread_messages || [],
          profiles: newMsg.profiles || {
            id: newMsg.user_id,
            username: 'Unknown'
          }
        })
      }
      return acc
    }, [...existingMessages.filter(msg => !messages.some(newMsg => newMsg.id === msg.id))])

    // Sort messages by timestamp
    const sortedMessages = mergedMessages.sort((a, b) => 
      new Date(a.inserted_at).getTime() - new Date(b.inserted_at).getTime()
    )

    set(state => ({
      messages: {
        ...state.messages,
        [type]: {
          ...state.messages[type],
          [storeKey]: sortedMessages
        }
      }
    }))
  },

  updateReactions: (type, key, messageId, reactions) => {
    const storeKey = getStoreKey(type, key)
    const existingMessage = get().messages[type][storeKey]?.find(msg => msg.id === messageId)
    
    if (!existingMessage) return

    // Create a map of reactions grouped by emoji
    const reactionMap = reactions.reduce((acc, reaction) => {
      const key = reaction.emoji
      if (!acc.has(key)) {
        acc.set(key, {
          emoji: key,
          count: 0,
          reacted_by_me: false
        })
      }
      const current = acc.get(key)!
      current.count++
      if (reaction.user_id === existingMessage.user_id) {
        current.reacted_by_me = true
      }
      return acc
    }, new Map<string, UiMessageReaction>())

    // Convert map back to array
    const updatedReactions = Array.from(reactionMap.values())

    set(state => ({
      messages: {
        ...state.messages,
        [type]: {
          ...state.messages[type],
          [storeKey]: state.messages[type][storeKey].map(msg =>
            msg.id === messageId
              ? { ...msg, reactions: updatedReactions }
              : msg
          )
        }
      }
    }))
  },

  addMessage: (type, key, message) => {
    const storeKey = getStoreKey(type, key)
    const existingMessages = get().messages[type][storeKey] || []
    const existingIndex = existingMessages.findIndex(msg => msg.id === message.id)

    if (existingIndex !== -1) {
      // Message exists, update it
      const existingMessage = existingMessages[existingIndex]
      const updatedMessage = {
        ...existingMessage,
        ...message,
        reactions: message.reactions?.length ? message.reactions : existingMessage.reactions,
        thread_messages: message.thread_messages?.length ? message.thread_messages : existingMessage.thread_messages,
        profiles: message.profiles || existingMessage.profiles
      }

      const updatedMessages = [...existingMessages]
      updatedMessages[existingIndex] = updatedMessage

      set(state => ({
        messages: {
          ...state.messages,
          [type]: {
            ...state.messages[type],
            [storeKey]: updatedMessages.sort((a, b) => 
              new Date(a.inserted_at).getTime() - new Date(b.inserted_at).getTime()
            )
          }
        }
      }))
    } else {
      // New message, add it
      const newMessage = {
        ...message,
        reactions: message.reactions || [],
        thread_messages: message.thread_messages || [],
        profiles: message.profiles || {
          id: message.user_id,
          username: 'Unknown'
        }
      }

      set(state => ({
        messages: {
          ...state.messages,
          [type]: {
            ...state.messages[type],
            [storeKey]: [...existingMessages, newMessage].sort((a, b) => 
              new Date(a.inserted_at).getTime() - new Date(b.inserted_at).getTime()
            )
          }
        }
      }))
    }
  },

  addThreadMessage: (parentId, message) => {
    const storeKey = getStoreKey('threads', parentId)
    const existingMessages = get().messages.threads[storeKey] || []
    const existingIndex = existingMessages.findIndex(msg => msg.id === message.id)

    if (existingIndex !== -1) {
      // Message exists, update it
      const existingMessage = existingMessages[existingIndex]
      const updatedMessage = {
        ...existingMessage,
        ...message,
        reactions: message.reactions?.length ? message.reactions : existingMessage.reactions,
        profiles: message.profiles || existingMessage.profiles
      }

      const updatedMessages = [...existingMessages]
      updatedMessages[existingIndex] = updatedMessage

      set(state => ({
        messages: {
          ...state.messages,
          threads: {
            ...state.messages.threads,
            [storeKey]: updatedMessages.sort((a, b) => 
              new Date(a.inserted_at).getTime() - new Date(b.inserted_at).getTime()
            )
          }
        }
      }))
    } else {
      // New message, add it
      const newMessage = {
        ...message,
        reactions: message.reactions || [],
        thread_messages: [],
        profiles: message.profiles || {
          id: message.user_id,
          username: 'Unknown'
        }
      }

      set(state => ({
        messages: {
          ...state.messages,
          threads: {
            ...state.messages.threads,
            [storeKey]: [...existingMessages, newMessage].sort((a, b) => 
              new Date(a.inserted_at).getTime() - new Date(b.inserted_at).getTime()
            )
          }
        }
      }))
    }
  },

  deleteMessage: (type, key, messageId) => {
    const storeKey = getStoreKey(type, key)
    const existingMessages = get().messages[type][storeKey] || []
    const updatedMessages = existingMessages.filter(msg => msg.id !== messageId)

    if (updatedMessages.length !== existingMessages.length) {
      set(state => ({
        messages: {
          ...state.messages,
          [type]: {
            ...state.messages[type],
            [storeKey]: updatedMessages
          }
        }
      }))
    }
  },

  clearError: () => set({ error: null }),
  reset: () => set(initialState)
})) 
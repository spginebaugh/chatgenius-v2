"use client"

import { create } from 'zustand'
import type { UiMessage } from '@/types/messages-ui'
import type { MessageReaction } from '@/types/database'
import type { MessagesState, MessageStoreType } from './types'
import { getStoreKey, mergeMessages, formatReactions, formatMessageForStore } from './utils'

// Constants
const initialState = {
  messages: {
    channels: {},
    dms: {},
    threads: {}
  },
  error: null,
  isLoading: false
}

// Message Update Helpers
function updateMessageInList(messages: UiMessage[], messageId: number, updater: (msg: UiMessage) => UiMessage): UiMessage[] {
  return messages.map(msg => msg.id === messageId ? updater(msg) : msg)
}

function sortMessagesByDate(messages: UiMessage[]): UiMessage[] {
  return [...messages].sort((a, b) => 
    new Date(a.inserted_at).valueOf() - new Date(b.inserted_at).valueOf()
  )
}

// Message State Updates
function updateMessagesState(
  state: MessagesState['messages'],
  type: MessageStoreType,
  storeKey: string,
  messages: UiMessage[]
): MessagesState['messages'] {
  return {
    ...state,
    [type]: {
      ...state[type],
      [storeKey]: messages
    }
  }
}

// Message Operations
function handleExistingMessage(existingMessage: UiMessage, newMessage: UiMessage): UiMessage {
  return {
    ...existingMessage,
    ...newMessage,
    reactions: newMessage.reactions?.length ? newMessage.reactions : existingMessage.reactions,
    thread_messages: newMessage.thread_messages?.length ? newMessage.thread_messages : existingMessage.thread_messages,
    profiles: newMessage.profiles || existingMessage.profiles
  }
}

function addMessageToList(messages: UiMessage[], message: UiMessage): UiMessage[] {
  const existingIndex = messages.findIndex(msg => msg.id === message.id)
  
  if (existingIndex !== -1) {
    const updatedMessages = [...messages]
    updatedMessages[existingIndex] = handleExistingMessage(messages[existingIndex], message)
    return sortMessagesByDate(updatedMessages)
  }
  
  return sortMessagesByDate([...messages, formatMessageForStore(message)])
}

// Store Actions
const createMessageActions = (
  set: (fn: (state: MessagesState) => Partial<MessagesState>) => void,
  get: () => MessagesState
): Omit<MessagesState, keyof typeof initialState> => ({
  setMessages: (type: MessageStoreType, key: string | number, messages: UiMessage[]) => {
    const storeKey = getStoreKey(type, key)
    const existingMessages = get().messages[type][storeKey] || []
    const mergedMessages = mergeMessages(existingMessages, messages)

    set(state => ({
      messages: updateMessagesState(state.messages, type, storeKey, mergedMessages)
    }))
  },

  updateReactions: (type: MessageStoreType, key: string | number, messageId: number, reactions: MessageReaction[]) => {
    const storeKey = getStoreKey(type, key)
    const existingMessage = get().messages[type][storeKey]?.find(msg => msg.id === messageId)
    
    if (!existingMessage) return

    const updatedReactions = formatReactions(reactions, existingMessage.user_id)
    const updatedMessages = updateMessageInList(
      get().messages[type][storeKey],
      messageId,
      msg => ({ ...msg, reactions: updatedReactions })
    )

    set(state => ({
      messages: updateMessagesState(state.messages, type, storeKey, updatedMessages)
    }))
  },

  addMessage: (type: MessageStoreType, key: string | number, message: UiMessage) => {
    const storeKey = getStoreKey(type, key)
    const existingMessages = get().messages[type][storeKey] || []
    const updatedMessages = addMessageToList(existingMessages, message)

    set(state => ({
      messages: updateMessagesState(state.messages, type, storeKey, updatedMessages)
    }))
  },

  addThreadMessage: (parentId: number, message: UiMessage) => {
    const storeKey = getStoreKey('threads', parentId)
    const existingMessages = get().messages.threads[storeKey] || []
    const updatedMessages = addMessageToList(existingMessages, message)

    set(state => ({
      messages: updateMessagesState(state.messages, 'threads', storeKey, updatedMessages)
    }))
  },

  deleteMessage: (type: MessageStoreType, key: string | number, messageId: number) => {
    const storeKey = getStoreKey(type, key)
    const existingMessages = get().messages[type][storeKey] || []
    const updatedMessages = existingMessages.filter(msg => msg.id !== messageId)

    if (updatedMessages.length !== existingMessages.length) {
      set(state => ({
        messages: updateMessagesState(state.messages, type, storeKey, updatedMessages)
      }))
    }
  },

  clearError: () => set(() => ({ error: null })),
  reset: () => set(() => initialState)
})

// Create Store
export const useMessagesStore = create<MessagesState>()(
  (set, get) => ({
    ...initialState,
    ...createMessageActions(set, get)
  })
)

// Re-export types
export * from './types' 
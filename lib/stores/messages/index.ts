"use client"

import { create } from 'zustand'
import type { UiMessage, UiMessageReaction } from '@/types/messages-ui'
import type { MessageReaction } from '@/types/database'
import type { MessagesState, MessageStoreType } from './types'
import { getStoreKey, mergeMessages, formatReactions, formatMessageForStore } from './utils'

// Constants
const initialState: MessagesState = {
  messages: {
    channel: {},
    direct: {},
    thread: {}
  },
  error: null,
  isLoading: false,
  
  setMessages: () => {},
  updateReactions: () => {},
  addMessage: () => {},
  addThreadMessage: () => {},
  deleteMessage: () => {},
  clearError: () => {},
  reset: () => {}
}

// Message Update Helpers
function updateMessageInList(messages: UiMessage[], messageId: number, updater: (msg: UiMessage) => UiMessage): UiMessage[] {
  return messages.map(msg => msg.message_id === messageId ? updater(msg) : msg)
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
  const existingIndex = messages.findIndex(msg => msg.message_id === message.message_id)
  
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

  updateReactions: (type: MessageStoreType, key: string | number, messageId: number, reactions: UiMessageReaction[]) => {
    const storeKey = getStoreKey(type, key)
    const existingMessage = get().messages[type][storeKey]?.find(msg => msg.message_id === messageId)
    
    if (!existingMessage) return

    const updatedMessages = updateMessageInList(
      get().messages[type][storeKey],
      messageId,
      msg => ({ ...msg, reactions })
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
    const storeKey = getStoreKey('thread', parentId)
    const existingMessages = get().messages.thread[storeKey] || []
    const updatedMessages = addMessageToList(existingMessages, message)

    set(state => ({
      messages: updateMessagesState(state.messages, 'thread', storeKey, updatedMessages)
    }))
  },

  deleteMessage: (type: MessageStoreType, key: string | number, messageId: number) => {
    const storeKey = getStoreKey(type, key)
    const existingMessages = get().messages[type][storeKey] || []
    const updatedMessages = existingMessages.filter(msg => msg.message_id !== messageId)

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
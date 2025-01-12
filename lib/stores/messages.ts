"use client"

import { createStore } from './config'
import { ReactionType } from '@/types/frontend'

export interface Message {
  id: string
  message: string
  inserted_at: string
  profiles: {
    id: string
    username: string
  }
  thread_messages?: Message[]
  reactions?: ReactionType[]
  parent_id?: string
  parent_type?: 'channel_message' | 'direct_message'
}

interface MessagesState {
  messages: Record<string, Message[]> // Keyed by channelId or userId for DMs
  isLoading: boolean
  error: string | null
  
  // Actions
  setMessages: (key: string, messages: Message[]) => void
  addMessage: (key: string, message: Message) => void
  addThreadMessage: (key: string, parentId: string, message: Message) => void
  updateReactions: (key: string, messageId: string, reactions: ReactionType[], parentType: 'channel_message' | 'direct_message' | 'thread_message') => void
  deleteMessage: (key: string, messageId: string) => void
  setError: (error: string | null) => void
  setLoading: (isLoading: boolean) => void
  reset: () => void
}

const initialState: Pick<MessagesState, 'messages' | 'isLoading' | 'error'> = {
  messages: {},
  isLoading: false,
  error: null,
}

export const useMessagesStore = createStore<MessagesState>({
  ...initialState,

  // Set all messages for a channel/DM
  setMessages: (key, messages) =>
    useMessagesStore.setState(state => ({
      messages: {
        ...state.messages,
        [key]: messages
      }
    })),

  // Add a single message
  addMessage: (key, message) =>
    useMessagesStore.setState(state => ({
      messages: {
        ...state.messages,
        [key]: [...(state.messages[key] || []), message]
      }
    })),

  // Add a thread message
  addThreadMessage: (key, parentId, message) =>
    useMessagesStore.setState(state => ({
      messages: {
        ...state.messages,
        [key]: state.messages[key]?.map(msg => 
          msg.id === parentId
            ? {
                ...msg,
                thread_messages: [...(msg.thread_messages || []), message]
              }
            : msg
        ) || []
      }
    })),

  // Update message reactions
  updateReactions: (key, messageId, reactions, parentType) =>
    useMessagesStore.setState(state => ({
      messages: {
        ...state.messages,
        [key]: state.messages[key]?.map(msg => {
          if (parentType === 'thread_message' && msg.thread_messages) {
            return {
              ...msg,
              thread_messages: msg.thread_messages.map(tm =>
                tm.id === messageId ? { ...tm, reactions } : tm
              )
            }
          }
          return msg.id === messageId ? { ...msg, reactions } : msg
        }) || []
      }
    })),

  // Delete a message
  deleteMessage: (key, messageId) =>
    useMessagesStore.setState(state => ({
      messages: {
        ...state.messages,
        [key]: state.messages[key]?.filter(msg => msg.id !== messageId) || []
      }
    })),

  // Error handling
  setError: (error) => useMessagesStore.setState({ error }),
  
  // Loading state
  setLoading: (isLoading) => useMessagesStore.setState({ isLoading }),
  
  // Reset store
  reset: () => useMessagesStore.setState(initialState)
}, 'messages-store', true) // Enable storage for offline support 
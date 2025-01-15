"use client"

import { createContext, useContext, useCallback, ReactNode } from "react"
import type { User } from "@/types/database"
import type { UiMessage, UiFileAttachment } from "@/types/messages-ui"
import { useChatMessages } from "../hooks/use-chat-messages"
import { ChatViewData } from "../shared"
import { getViewKeyAndType } from "../utils/view-helpers"

interface MessagesContextValue {
  messages: UiMessage[]
  handleSendMessage: (message: string, files?: UiFileAttachment[]) => Promise<void>
  handleEmojiSelect: (messageId: number, emoji: string) => Promise<void>
}

const MessagesContext = createContext<MessagesContextValue | null>(null)

interface MessagesProviderProps {
  children: ReactNode
  initialView: ChatViewData
  users: User[]
  currentUser: User
}

export function MessagesProvider({ children, initialView, users, currentUser }: MessagesProviderProps) {
  // Get view type and key
  const { messageType, key, channelId, receiverId } = getViewKeyAndType(initialView)

  // Setup message management
  const { messages, handleSendMessage, handleEmojiSelect } = useChatMessages({
    messageType,
    key,
    users,
    currentUser,
    channelId,
    receiverId
  })

  const value = {
    messages,
    handleSendMessage,
    handleEmojiSelect
  }

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  )
}

export function useMessages() {
  const context = useContext(MessagesContext)
  if (!context) {
    throw new Error("useMessages must be used within a MessagesProvider")
  }
  return context
} 
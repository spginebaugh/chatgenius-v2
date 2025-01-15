"use client"

import { ReactNode } from "react"
import type { User, Channel } from "@/types/database"
import type { UiMessage } from "@/types/messages-ui"
import { ChatViewData } from "../shared"
import { MessagesProvider } from "./messages-provider"
import { UsersProvider } from "./users-provider"
import { RealtimeProvider } from "./realtime-provider"

interface ChatProviderProps {
  children: ReactNode
  initialView: ChatViewData
  currentUser: User
  channels: Channel[]
  users: User[]
  initialMessages: UiMessage[]
}

export function ChatProvider({ 
  children,
  initialView,
  currentUser: initialCurrentUser,
  channels,
  users: initialUsers,
  initialMessages
}: ChatProviderProps) {
  return (
    <RealtimeProvider>
      <UsersProvider
        initialUsers={initialUsers}
        initialCurrentUser={initialCurrentUser}
      >
        <MessagesProvider
          initialView={initialView}
          users={initialUsers}
          currentUser={initialCurrentUser}
        >
          {children}
        </MessagesProvider>
      </UsersProvider>
    </RealtimeProvider>
  )
} 
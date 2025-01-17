"use client"

import { ReactNode } from "react"
import { MessagesProvider } from "./messages-provider"
import { UsersProvider } from "./users-provider"
import { ChannelsProvider } from "./channels-provider"
import type { User } from "@/types/database"
import type { ChatViewData } from "../shared"

interface ChatProviderProps {
  children: ReactNode
  initialUsers: User[]
  currentUser: User
  initialView: ChatViewData
}

export function ChatProvider({ children, initialUsers, currentUser, initialView }: ChatProviderProps) {
  return (
    <ChannelsProvider>
      <UsersProvider initialUsers={initialUsers} initialCurrentUser={currentUser}>
        <MessagesProvider initialView={initialView} users={initialUsers} currentUser={currentUser}>
          {children}
        </MessagesProvider>
      </UsersProvider>
    </ChannelsProvider>
  )
} 
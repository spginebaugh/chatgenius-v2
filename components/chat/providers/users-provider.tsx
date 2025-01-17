"use client"

import { createContext, useContext, ReactNode } from "react"
import type { User } from "@/types/database"
import { useChatUsers } from "../hooks/use-chat-users"
import { usePresence } from "../hooks/use-presence"

interface UsersContextValue {
  users: User[]
  currentUser: User
  handleUserUpdate: (updatedUser: User) => void
  handleLogout: () => Promise<void>
}

const UsersContext = createContext<UsersContextValue | null>(null)

interface UsersProviderProps {
  children: ReactNode
  initialUsers: User[]
  initialCurrentUser: User
}

export function UsersProvider({ children, initialUsers, initialCurrentUser }: UsersProviderProps) {
  // Setup user management
  const { users, currentUser, handleUserUpdate, handleLogout } = useChatUsers(initialUsers, initialCurrentUser)

  // Setup presence management
  usePresence(currentUser, handleUserUpdate)

  const value = {
    users,
    currentUser,
    handleUserUpdate,
    handleLogout
  }

  return (
    <UsersContext.Provider value={value}>
      {children}
    </UsersContext.Provider>
  )
}

export function useUsers() {
  const context = useContext(UsersContext)
  if (!context) {
    throw new Error("useUsers must be used within a UsersProvider")
  }
  return context
} 
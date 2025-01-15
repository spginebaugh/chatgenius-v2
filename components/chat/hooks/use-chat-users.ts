import { useState, useCallback } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { User } from "@/types/database"
import type { UiProfile } from "@/types/messages-ui"
import { useRealtimeUsers } from "@/lib/client/hooks/use-realtime-users"
import { createClient } from "@/lib/supabase/client"

// Types
interface UseUserStateReturn {
  users: User[]
  currentUser: User
  setUsers: Dispatch<SetStateAction<User[]>>
  setCurrentUser: (user: User) => void
}

interface UseUserUpdateProps {
  currentUser: User
  setCurrentUser: (user: User) => void
  setUsers: Dispatch<SetStateAction<User[]>>
}

interface UseUserLogoutProps {
  currentUser: User
  setCurrentUser: (user: User) => void
  setUsers: Dispatch<SetStateAction<User[]>>
}

// User Profile Formatting
export function createUiProfile(user: User | undefined, fallbackId: string): UiProfile {
  return {
    id: user?.id || fallbackId,
    username: user?.username || 'Unknown',
    profile_picture_url: user?.profile_picture_url || null,
    status: user?.status || 'OFFLINE'
  }
}

// User State Management
function useUserState(initialUsers: User[], initialCurrentUser: User): UseUserStateReturn {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [currentUser, setCurrentUser] = useState<User>(initialCurrentUser)

  return {
    users,
    currentUser,
    setUsers,
    setCurrentUser
  }
}

// User Update Handler
function useUserUpdate({ currentUser, setCurrentUser, setUsers }: UseUserUpdateProps) {
  return useCallback((updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u))
    
    // Update current user if it's them
    if (updatedUser.id === currentUser.id) {
      setCurrentUser(updatedUser)
    }
  }, [currentUser.id, setCurrentUser, setUsers])
}

// Database Operations
async function updateUserStatus(userId: string, status: 'OFFLINE' | 'ONLINE') {
  const supabase = createClient()
  const { error } = await supabase
    .from('users')
    .update({ 
      status,
      last_active_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (error) {
    throw new Error(`Failed to update user status: ${error.message}`)
  }
}

async function signOutUser() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    throw new Error(`Sign out failed: ${error.message}`)
  }
}

// User Logout Handler
function useUserLogout({ currentUser, setCurrentUser, setUsers }: UseUserLogoutProps) {
  return useCallback(async () => {
    try {
      // Create offline user state
      const updatedUser = { 
        ...currentUser, 
        status: 'OFFLINE' as const, 
        last_active_at: new Date().toISOString() 
      }
      
      // Update local state first for immediate UI feedback
      setCurrentUser(updatedUser)
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u))

      // Update database and sign out
      await updateUserStatus(currentUser.id, 'OFFLINE')
      await signOutUser()
    } catch (error) {
      console.error("Logout failed:", error instanceof Error ? error.message : 'Unknown error')
      throw error // Re-throw to let caller handle the error
    }
  }, [currentUser, setCurrentUser, setUsers])
}

// Main Hook
interface UseChatUsersReturn {
  users: User[]
  currentUser: User
  handleUserUpdate: (updatedUser: User) => void
  handleLogout: () => Promise<void>
}

export function useChatUsers(initialUsers: User[], initialCurrentUser: User): UseChatUsersReturn {
  const { users, currentUser, setUsers, setCurrentUser } = useUserState(initialUsers, initialCurrentUser)

  const handleUserUpdate = useUserUpdate({
    currentUser,
    setCurrentUser,
    setUsers
  })

  const handleLogout = useUserLogout({
    currentUser,
    setCurrentUser,
    setUsers
  })

  // Setup real-time user updates
  useRealtimeUsers({
    onUserUpdate: handleUserUpdate
  })

  return {
    users,
    currentUser,
    handleUserUpdate,
    handleLogout
  }
} 
import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/types/database"

export function useChatUsers(initialUsers: User[], initialCurrentUser: User) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [currentUser, setCurrentUser] = useState<User>(initialCurrentUser)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let mounted = true
    async function fetchUsers() {
      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('username')

        if (error) throw error
        if (mounted) {
          setUsers(data || [])
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch users')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchUsers()
    return () => { mounted = false }
  }, [supabase]) // Only re-run if supabase client changes

  const handleUserUpdate = useCallback((updatedUser: User) => {
    if (updatedUser.user_id === currentUser.user_id) {
      setCurrentUser(updatedUser)
    }
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.user_id === updatedUser.user_id ? updatedUser : user
      )
    )
  }, [currentUser.user_id])

  const handleLogout = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  }, [supabase])

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => ({
    users,
    currentUser,
    isLoading,
    error,
    handleUserUpdate,
    handleLogout
  }), [users, currentUser, isLoading, error, handleUserUpdate, handleLogout])
} 
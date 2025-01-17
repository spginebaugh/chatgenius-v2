import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/types/database"
import type { RealtimePostgresUpdatePayload } from '@supabase/supabase-js'

export function useChatUsers(initialUsers: User[], initialCurrentUser: User) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [currentUser, setCurrentUser] = useState<User>(initialCurrentUser)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const isMounted = useRef(true)

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

    // Set up realtime subscription for user updates
    const channel = supabase.channel('user_updates')
      .on('postgres_changes' as const, {
        event: 'UPDATE',
        schema: 'public',
        table: 'users'
      }, async (payload: RealtimePostgresUpdatePayload<User>) => {
        if (!mounted || !payload.new) return

        // Update the user in our local state
        if (payload.new.user_id === currentUser.user_id) {
          setCurrentUser(payload.new)
        }
        setUsers(prev => prev.map(user => 
          user.user_id === payload.new.user_id ? payload.new : user
        ))
      })
      .subscribe()

    fetchUsers()
    return () => { 
      mounted = false
      channel.unsubscribe()
    }
  }, [supabase, currentUser.user_id])

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
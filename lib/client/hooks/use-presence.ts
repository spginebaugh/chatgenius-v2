"use client";

import { useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types/database'
import type { RealtimePostgresUpdatePayload } from '@supabase/supabase-js'
import { debounce } from 'lodash'

export function usePresence(currentUser: User, onUserUpdate: (user: User) => void) {
  const supabase = useMemo(() => createClient(), [])

  // Update user status to online with debouncing
  const setOnlineStatus = useCallback(
    debounce(async () => {
      if (!currentUser?.user_id) return

      const { error } = await supabase
        .from('users')
        .update({ 
          status: 'ONLINE',
          last_active_at: new Date().toISOString()
        })
        .eq('user_id', currentUser.user_id)

      if (error) {
        console.error('Failed to update online status:', error)
      }
    }, 1000),
    [currentUser?.user_id, supabase]
  )

  // Update user status to offline with debouncing
  const setOfflineStatus = useCallback(
    debounce(async () => {
      if (!currentUser?.user_id) return

      const { error } = await supabase
        .from('users')
        .update({ 
          status: 'OFFLINE',
          last_active_at: new Date().toISOString()
        })
        .eq('user_id', currentUser.user_id)

      if (error) {
        console.error('Failed to update offline status:', error)
      }
    }, 1000),
    [currentUser?.user_id, supabase]
  )

  useEffect(() => {
    // Set up realtime subscription for user status changes
    const channel = supabase.channel('user_status_changes')
      .on<RealtimePostgresUpdatePayload<User>>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `user_id=eq.${currentUser?.user_id}`
        },
        (payload) => {
          // Ensure payload.new has all required User properties before updating
          const newUser = payload.new
          if (
            newUser &&
            typeof newUser === 'object' &&
            'user_id' in newUser &&
            'username' in newUser &&
            'bio' in newUser &&
            'profile_picture_url' in newUser &&
            'last_active_at' in newUser &&
            'status' in newUser &&
            'inserted_at' in newUser
          ) {
            onUserUpdate(newUser as unknown as User)
          }
        }
      )
      .subscribe()

    // Set initial online status
    setOnlineStatus()

    // Handle visibility change with debouncing
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setOnlineStatus()
      } else {
        setOfflineStatus()
      }
    }

    // Handle beforeunload
    const handleBeforeUnload = () => {
      setOfflineStatus.flush() // Ensure offline status is set immediately
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      setOnlineStatus.cancel() // Cancel any pending debounced calls
      setOfflineStatus.cancel()
      channel.unsubscribe()
    }
  }, [currentUser?.user_id, onUserUpdate, setOnlineStatus, setOfflineStatus, supabase])
} 
"use client";

import { useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types/database'
import type { RealtimePostgresUpdatePayload, RealtimeChannel } from '@supabase/supabase-js'

type UserUpdatePayload = {
  user_id: string
  username: string
  bio: string
  profile_picture_url: string | null
  last_active_at: string
  status: User['status']
  inserted_at: string
}

export function usePresence(currentUser: User, onUserUpdate: (user: User) => void) {
  const supabase = useMemo(() => createClient(), [])

  // Update user status to online
  const setOnlineStatus = useCallback(async () => {
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
  }, [currentUser?.user_id, supabase])

  // Update user status to offline
  const setOfflineStatus = useCallback(async () => {
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
  }, [currentUser?.user_id, supabase])

  useEffect(() => {
    // Set up realtime subscription for user status changes
    const channel: RealtimeChannel = supabase.channel('user_status_changes')

    channel
      .on('postgres_changes' as const, {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
      }, async (payload: RealtimePostgresUpdatePayload<UserUpdatePayload>) => {
        if (payload.new) {
          // Convert the payload to a proper User object
          const updatedUser: User = {
            user_id: payload.new.user_id,
            username: payload.new.username,
            bio: payload.new.bio,
            profile_picture_url: payload.new.profile_picture_url,
            last_active_at: payload.new.last_active_at,
            status: payload.new.status,
            inserted_at: payload.new.inserted_at
          }
          onUserUpdate(updatedUser)
        }
      })
      .subscribe()

    // Set initial online status
    setOnlineStatus()

    // Handle window focus/blur events
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setOnlineStatus()
      } else {
        setOfflineStatus()
      }
    }

    // Handle beforeunload event
    const handleBeforeUnload = () => {
      setOfflineStatus()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      channel.unsubscribe()
      setOfflineStatus()
    }
  }, [currentUser?.user_id, onUserUpdate, setOnlineStatus, setOfflineStatus, supabase])
} 
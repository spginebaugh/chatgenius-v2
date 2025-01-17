"use client";

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserStatus } from '@/types/database'
import type { RealtimePostgresUpdatePayload } from '@supabase/supabase-js'

interface UserStatusPayload {
  status: UserStatus
}

export function useOnlineStatus(userId: string) {
  const [status, setStatus] = useState<UserStatus>('OFFLINE')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    let isMounted = true

    async function fetchStatus() {
      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from('users')
          .select('status')
          .eq('user_id', userId)
          .single()

        if (error) throw error
        if (isMounted) {
          setStatus(data?.status || 'OFFLINE')
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch user status')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    // Initial fetch
    fetchStatus()

    // Set up realtime subscription
    const channel = supabase.channel('user_status_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `user_id=eq.${userId}`
        },
        (payload: RealtimePostgresUpdatePayload<UserStatusPayload>) => {
          if (isMounted && payload.new && (
            payload.new.status === 'ONLINE' || 
            payload.new.status === 'OFFLINE' || 
            payload.new.status === 'AWAY'
          )) {
            setStatus(payload.new.status)
          }
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      isMounted = false
      channel.unsubscribe()
    }
  }, [userId, supabase])

  return {
    status,
    isLoading,
    error
  }
} 
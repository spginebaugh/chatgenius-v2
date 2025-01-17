"use client";

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserStatus } from '@/types/database'

export function useOnlineStatus(userId: string) {
  const [status, setStatus] = useState<UserStatus>('OFFLINE')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchStatus() {
      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from('users')
          .select('status')
          .eq('user_id', userId)
          .single()

        if (error) throw error
        setStatus(data?.status || 'OFFLINE')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user status')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStatus()
  }, [userId])

  return {
    status,
    isLoading,
    error
  }
} 
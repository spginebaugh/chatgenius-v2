"use client"

import { useEffect, useState } from 'react'
import type { Channel } from '@/types/database'
import { selectRecords } from '@/lib/supabase/query-helpers'

interface UseChannelsResult {
  channels: Channel[]
  isLoading: boolean
  error: Error | null
}

export function useChannels(initialChannels: Channel[] = []): UseChannelsResult {
  const [channels, setChannels] = useState<Channel[]>(initialChannels)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setIsLoading(true)
        const fetchedChannels = await selectRecords<Channel>({
          table: 'channels',
          select: '*'
        })
        setChannels(fetchedChannels)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch channels'))
      } finally {
        setIsLoading(false)
      }
    }

    if (initialChannels.length === 0) {
      fetchChannels()
    }
  }, [initialChannels])

  return {
    channels,
    isLoading,
    error
  }
} 
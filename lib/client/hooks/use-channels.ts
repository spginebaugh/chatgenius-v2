"use client"

import { useEffect, useState, useRef, useMemo } from 'react'
import type { Channel } from '@/types/database'
import { selectRecords } from '@/lib/supabase/query-helpers'

interface UseChannelsResult {
  channels: Channel[]
  isLoading: boolean
  error: Error | null
}

// Stable comparison function for Channel objects
function compareChannels(a: Channel[], b: Channel[]): boolean {
  if (a.length !== b.length) return false
  
  return a.every((channelA, index) => {
    const channelB = b[index]
    return channelA.channel_id === channelB.channel_id &&
      channelA.slug === channelB.slug &&
      channelA.created_by === channelB.created_by
  })
}

export function useChannels(initialChannels: Channel[] = []): UseChannelsResult {
  const [channels, setChannels] = useState<Channel[]>(initialChannels)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  // Track if we've done the initial fetch
  const hasInitializedRef = useRef(false)
  
  // Store previous initialChannels for comparison
  const prevInitialChannelsRef = useRef<Channel[]>(initialChannels)

  // Memoize the comparison function
  const hasInitialChannelsChanged = useMemo(() => 
    !compareChannels(prevInitialChannelsRef.current, initialChannels)
  , [initialChannels])

  useEffect(() => {
    if (hasInitialChannelsChanged) {
      prevInitialChannelsRef.current = initialChannels
      setChannels(initialChannels)
      // Reset initialization flag if we get new initial channels
      hasInitializedRef.current = initialChannels.length > 0
    }

    const fetchChannels = async () => {
      // Don't fetch if we already have channels from props
      if (hasInitializedRef.current) return
      
      try {
        setIsLoading(true)
        const fetchedChannels = await selectRecords<Channel>({
          table: 'channels',
          select: '*'
        })
        setChannels(fetchedChannels)
        hasInitializedRef.current = true
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch channels'))
      } finally {
        setIsLoading(false)
      }
    }

    // Only fetch if we haven't initialized and don't have initial channels
    if (!hasInitializedRef.current && initialChannels.length === 0) {
      fetchChannels()
    }
  }, [hasInitialChannelsChanged]) // Only depend on the memoized comparison result

  return {
    channels,
    isLoading,
    error
  }
} 
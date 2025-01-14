"use client"

import { useCallback, useEffect, useRef } from 'react'
import type { Channel } from '@/types/database'
import { setupSubscription } from '@/lib/supabase/realtime-helpers'

interface UseRealtimeChannelsProps {
  onChannelUpdate?: (channel: Channel) => void
  onChannelDelete?: (channel: Channel) => void
}

type Subscription = Awaited<ReturnType<typeof setupSubscription>>

// Type guard to ensure a channel has all required fields
function isCompleteChannel(channel: Partial<Channel>): channel is Channel {
  return !!(
    channel.id &&
    channel.slug &&
    channel.created_by &&
    channel.inserted_at
  )
}

export function useRealtimeChannels({
  onChannelUpdate,
  onChannelDelete
}: UseRealtimeChannelsProps = {}) {
  const subscriptionRef = useRef<Subscription | null>(null)
  const callbacksRef = useRef({
    onChannelUpdate,
    onChannelDelete
  })

  // Keep callback refs up to date
  useEffect(() => {
    callbacksRef.current = {
      onChannelUpdate,
      onChannelDelete
    }
  }, [onChannelUpdate, onChannelDelete])

  // Memoized handlers
  const handleChannelUpdate = useCallback((channel: Channel) => {
    callbacksRef.current.onChannelUpdate?.(channel)
  }, [])

  const handleChannelDelete = useCallback((channel: Channel) => {
    callbacksRef.current.onChannelDelete?.(channel)
  }, [])

  useEffect(() => {
    const setupSubscriptions = async () => {
      // Clean up existing subscription if it exists
      if (subscriptionRef.current) {
        console.log('Cleaning up existing channel subscription')
        await subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }

      try {
        const subscription = await setupSubscription<Channel>({
          table: 'channels',
          onPayload: ({ eventType, new: newChannel, old: oldChannel }) => {
            if (eventType === 'UPDATE' && newChannel && isCompleteChannel(newChannel)) {
              handleChannelUpdate(newChannel)
            }
            if (eventType === 'DELETE' && oldChannel && isCompleteChannel(oldChannel)) {
              handleChannelDelete(oldChannel)
            }
          }
        })

        subscriptionRef.current = subscription
        console.log('Channel subscription set up')
      } catch (error) {
        console.error('Error setting up channel subscription:', error)
      }
    }

    setupSubscriptions()

    return () => {
      if (subscriptionRef.current) {
        console.log('Cleaning up channel subscription')
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [handleChannelUpdate, handleChannelDelete])

  return {}
} 
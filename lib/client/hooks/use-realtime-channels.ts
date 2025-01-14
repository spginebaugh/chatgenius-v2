"use client"

import { useCallback, useEffect, useRef } from 'react'
import type { Channel } from '@/types/database'
import { setupSubscription } from '@/lib/supabase/realtime-helpers'

interface UseRealtimeChannelsProps {
  onChannelUpdate?: (channel: Channel) => void
  onChannelDelete?: (channel: Channel) => void
}

type Subscription = Awaited<ReturnType<typeof setupSubscription>>

interface SubscriptionRefs {
  subscriptionRef: React.MutableRefObject<Subscription | null>
  callbacksRef: React.MutableRefObject<{
    onChannelUpdate?: (channel: Channel) => void
    onChannelDelete?: (channel: Channel) => void
  }>
}

// Type guard to ensure a channel has all required fields
function isCompleteChannel(channel: Partial<Channel>): channel is Channel {
  return !!(
    channel.id &&
    channel.slug &&
    channel.created_by &&
    channel.inserted_at
  )
}

function cleanupSubscription(refs: SubscriptionRefs) {
  if (refs.subscriptionRef.current) {
    console.log('Cleaning up channel subscription')
    refs.subscriptionRef.current.unsubscribe()
    refs.subscriptionRef.current = null
  }
}

function handleChannelUpdate(channel: Channel, refs: SubscriptionRefs) {
  refs.callbacksRef.current.onChannelUpdate?.(channel)
}

function handleChannelDelete(channel: Channel, refs: SubscriptionRefs) {
  refs.callbacksRef.current.onChannelDelete?.(channel)
}

async function setupChannelSubscription(refs: SubscriptionRefs) {
  // Clean up existing subscription if it exists
  if (refs.subscriptionRef.current) {
    console.log('Cleaning up existing channel subscription')
    await refs.subscriptionRef.current.unsubscribe()
    refs.subscriptionRef.current = null
  }

  try {
    const subscription = await setupSubscription<Channel>({
      table: 'channels',
      onPayload: ({ eventType, new: newChannel, old: oldChannel }) => {
        if (eventType === 'UPDATE' && newChannel && isCompleteChannel(newChannel)) {
          handleChannelUpdate(newChannel, refs)
        }
        if (eventType === 'DELETE' && oldChannel && isCompleteChannel(oldChannel)) {
          handleChannelDelete(oldChannel, refs)
        }
      }
    })

    refs.subscriptionRef.current = subscription
    console.log('Channel subscription set up')
  } catch (error) {
    console.error('Error setting up channel subscription:', error)
  }
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

  useEffect(() => {
    const refs: SubscriptionRefs = {
      subscriptionRef,
      callbacksRef
    }

    setupChannelSubscription(refs).catch(error => {
      console.error('Error in setupChannelSubscription:', error)
    })

    return () => cleanupSubscription(refs)
  }, []) // No dependencies needed since we use refs

  return {}
} 
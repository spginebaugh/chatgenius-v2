"use client"

import { useCallback, useEffect } from 'react'
import { useChannelsStore } from '@/lib/stores/channels'
import { Channel } from "@/types/database"
import { createChannel } from '@/app/actions/channels'
import { subscribeToChannels } from '@/lib/utils/realtime'

interface ChannelState {
  channels: Record<string, Channel>
  activeChannelId: string | null
  unreadCounts: Record<string, number>
  isLoading: boolean
  error: string | null
  setChannels: (channels: Channel[]) => void
  setActiveChannel: (channelId: string | null) => void
  updateUnreadCount: (channelId: string, count: number) => void
  setError: (error: string | null) => void
  setLoading: (isLoading: boolean) => void
  reset: () => void
}

interface CreateChannelInput {
  slug: string
  createdBy: string
}

export function useChannels() {
  const store = useChannelsStore()
  const {
    channels,
    activeChannelId,
    unreadCounts,
    isLoading,
    error,
    setChannels,
    setActiveChannel,
    updateUnreadCount,
    setError,
    setLoading,
    reset
  } = store

  // Channel Actions
  const createNewChannel = useCallback(async (input: CreateChannelInput) => {
    try {
      setLoading(true)
      
      // Create channel using server action
      await createChannel({
        name: input.slug,
        description: ''
      })

      setError(null)
    } catch (err) {
      console.error('Error creating channel:', err)
      setError(err instanceof Error ? err.message : 'Failed to create channel')
    } finally {
      setLoading(false)
    }
  }, [setError, setLoading])

  // Real-time Channel Updates
  useEffect(() => {
    const subscription = subscribeToChannels({
      callbacks: {
        onInsert: (newChannel: Channel) => {
          setChannels([...Object.values(channels), newChannel])
        },
        onUpdate: (updatedChannel: Channel) => {
          setChannels(Object.values(channels).map(c => 
            c.channel_id === updatedChannel.channel_id ? updatedChannel : c
          ))
        },
        onDelete: (deletedChannel: Channel) => {
          if (deletedChannel?.channel_id) {
            const channelId = deletedChannel.channel_id.toString()
            setChannels(Object.values(channels).filter(c => c.channel_id.toString() !== channelId))
          }
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [channels, setChannels])

  // Utility Functions
  const getChannelById = useCallback((channelId: string): Channel | undefined => {
    return channels[channelId as keyof typeof channels] || undefined
  }, [channels])

  const getUnreadCount = useCallback((channelId: string): number => {
    return unreadCounts[channelId] || 0
  }, [unreadCounts])

  // Get active channel
  const activeChannel = activeChannelId ? channels[activeChannelId as keyof typeof channels] : null

  // Convert channels record to array for external API
  const channelsList = Object.values(channels)

  return {
    channels: channelsList,
    activeChannel,
    unreadCounts,
    isLoading,
    error,
    createNewChannel,
    setActiveChannel,
    getChannelById,
    getUnreadCount,
    updateUnreadCount,
    reset
  }
} 
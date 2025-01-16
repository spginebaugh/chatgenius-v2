"use client"

import { createStore } from './config'
import { Channel } from '@/types/database'

interface ChannelsState {
  channels: Record<number, Channel>
  activeChannelId: number | null
  unreadCounts: Record<number, number>
  isLoading: boolean
  error: string | null

  // Actions
  setChannels: (channels: Channel[]) => void
  setActiveChannel: (channelId: number | null) => void
  updateUnreadCount: (channelId: number, count: number) => void
  addChannel: (channel: Channel) => void
  updateChannel: (channelId: number, updates: Partial<Channel>) => void
  removeChannel: (channelId: number) => void
  setError: (error: string | null) => void
  setLoading: (isLoading: boolean) => void
  reset: () => void
}

const initialState: Pick<ChannelsState, 'channels' | 'activeChannelId' | 'unreadCounts' | 'isLoading' | 'error'> = {
  channels: {},
  activeChannelId: null,
  unreadCounts: {},
  isLoading: false,
  error: null,
}

export const useChannelsStore = createStore<ChannelsState>({
  ...initialState,

  // Set all channels
  setChannels: (channels) =>
    useChannelsStore.setState(state => ({
      channels: channels.reduce((acc, channel) => {
        acc[channel.channel_id] = channel
        return acc
      }, {} as Record<number, Channel>)
    })),

  // Set active channel
  setActiveChannel: (channelId) =>
    useChannelsStore.setState({ activeChannelId: channelId }),

  // Update unread count
  updateUnreadCount: (channelId, count) =>
    useChannelsStore.setState(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        [channelId]: count
      }
    })),

  // Add new channel
  addChannel: (channel) =>
    useChannelsStore.setState(state => ({
      channels: {
        ...state.channels,
        [channel.channel_id]: channel
      }
    })),

  // Update channel
  updateChannel: (channelId, updates) =>
    useChannelsStore.setState(state => ({
      channels: {
        ...state.channels,
        [channelId]: {
          ...state.channels[channelId],
          ...updates
        }
      }
    })),

  // Remove channel
  removeChannel: (channelId) =>
    useChannelsStore.setState(state => {
      const { [channelId]: removed, ...channels } = state.channels
      return { channels }
    }),

  // Error handling
  setError: (error) => useChannelsStore.setState({ error }),

  // Loading state
  setLoading: (isLoading) => useChannelsStore.setState({ isLoading }),

  // Reset store
  reset: () => useChannelsStore.setState(initialState)
}, 'channels-store', true) // Enable storage for offline support 
"use client"

import { createStore } from './config'
import { Channel } from '@/types/database'

interface ChannelsState {
  channels: Record<number, Channel>
  activeChannelId: number | null
  isLoading: boolean
  error: string | null
}

interface ChannelsActions {
  setChannels: (channels: Channel[]) => void
  setActiveChannel: (channelId: number | null) => void
  addChannel: (channel: Channel) => void
  updateChannel: (channelId: number, updates: Partial<Channel>) => void
  removeChannel: (channelId: number) => void
  setError: (error: string | null) => void
  setLoading: (isLoading: boolean) => void
  reset: () => void
}

type ChannelsStore = ChannelsState & ChannelsActions

const initialState: ChannelsState = {
  channels: {},
  activeChannelId: null,
  isLoading: false,
  error: null,
}

const createActions = (set: (fn: (state: ChannelsState) => Partial<ChannelsState>) => void): ChannelsActions => ({
  setChannels: (channels: Channel[]) => 
    set((state) => ({
      channels: channels.reduce((acc: Record<number, Channel>, channel: Channel) => {
        acc[channel.channel_id] = channel
        return acc
      }, {})
    })),

  setActiveChannel: (channelId: number | null) => 
    set(() => ({ activeChannelId: channelId })),

  addChannel: (channel: Channel) => 
    set((state) => ({
      channels: {
        ...state.channels,
        [channel.channel_id]: channel
      }
    })),

  updateChannel: (channelId: number, updates: Partial<Channel>) => 
    set((state) => ({
      channels: {
        ...state.channels,
        [channelId]: {
          ...state.channels[channelId],
          ...updates
        }
      }
    })),

  removeChannel: (channelId: number) => 
    set((state) => {
      const { [channelId]: _, ...rest } = state.channels
      return { channels: rest }
    }),

  setError: (error: string | null) => set(() => ({ error })),
  setLoading: (isLoading: boolean) => set(() => ({ isLoading })),
  reset: () => set(() => initialState)
})

export const useChannelsStore = createStore<ChannelsStore>({
  ...initialState,
  ...createActions((fn) => useChannelsStore.setState(fn))
}, 'channels-store', true) 
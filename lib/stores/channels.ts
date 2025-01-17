"use client"

import { createStore } from './config'
import { Channel } from '@/types/database'

type SetState<T> = (
  partial: T | Partial<T> | ((state: T) => T | Partial<T>),
  replace?: boolean
) => void

interface ChannelsState {
  channels: Record<number, Channel>
  activeChannelId: number | null
  isLoading: boolean
  error: string | null
  setChannels: (channels: Channel[]) => void
  setActiveChannel: (channelId: number | null) => void
  addChannel: (channel: Channel) => void
  updateChannel: (channelId: number, updates: Partial<Channel>) => void
  removeChannel: (channelId: number) => void
  setError: (error: string | null) => void
  setLoading: (isLoading: boolean) => void
  reset: () => void
}

const initialState = {
  channels: {} as Record<number, Channel>,
  activeChannelId: null as number | null,
  isLoading: false,
  error: null as string | null,
}

export const useChannelsStore = createStore<ChannelsState>((set: SetState<ChannelsState>) => ({
  ...initialState,

  setChannels: (channels: Channel[]) => 
    set((state: ChannelsState) => ({
      channels: channels.reduce((acc: Record<number, Channel>, channel: Channel) => {
        acc[channel.channel_id] = channel
        return acc
      }, {} as Record<number, Channel>)
    })),

  setActiveChannel: (channelId: number | null) => 
    set({ activeChannelId: channelId }),

  addChannel: (channel: Channel) => 
    set((state: ChannelsState) => ({
      channels: {
        ...state.channels,
        [channel.channel_id]: channel
      }
    })),

  updateChannel: (channelId: number, updates: Partial<Channel>) => 
    set((state: ChannelsState) => ({
      channels: {
        ...state.channels,
        [channelId]: {
          ...state.channels[channelId],
          ...updates
        }
      }
    })),

  removeChannel: (channelId: number) => 
    set((state: ChannelsState) => {
      const { [channelId]: _, ...rest } = state.channels
      return { channels: rest }
    }),

  setError: (error: string | null) => set({ error }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  reset: () => set(initialState)
}), 'channels-store', true) 
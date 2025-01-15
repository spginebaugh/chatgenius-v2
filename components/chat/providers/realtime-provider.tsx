"use client"

import { createContext, useContext, ReactNode, useCallback } from "react"
import type { Channel } from "@/types/database"
import { useRealtimeChannels } from "@/lib/client/hooks/use-realtime-channels"
import { useChannelsStore } from "@/lib/stores/channels"

interface RealtimeContextValue {
  setActiveChannel: (channelId: number) => void
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null)

interface RealtimeProviderProps {
  children: ReactNode
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { setActiveChannel } = useChannelsStore()

  // Setup realtime channel updates
  useRealtimeChannels({
    onChannelUpdate: (channel) => {
      console.log("Realtime channel update:", channel)
      setActiveChannel(channel.id)
    }
  })

  const value = {
    setActiveChannel
  }

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error("useRealtime must be used within a RealtimeProvider")
  }
  return context
} 
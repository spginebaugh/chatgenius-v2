"use client"

import { ReactNode, useEffect } from "react"
import { useChannelsStore } from "@/lib/stores/channels"
import type { Channel } from "@/types/database"

interface ChannelsProviderProps {
  children: ReactNode
  initialChannels?: Channel[]
}

export function ChannelsProvider({ children, initialChannels = [] }: ChannelsProviderProps) {
  const { setChannels } = useChannelsStore()

  // Initialize channels on mount
  useEffect(() => {
    if (initialChannels.length > 0) {
      setChannels(initialChannels)
    }
  }, [initialChannels, setChannels])

  return <>{children}</>
} 
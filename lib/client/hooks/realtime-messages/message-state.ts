"use client"

import { useRef, useState } from 'react'
import type { UiMessage } from '@/types/messages-ui'
import { useMountedRef } from './subscription-hooks'

export function useMessageState(initialMessages: UiMessage[]) {
  const [realtimeMessages, setRealtimeMessages] = useState<UiMessage[]>(initialMessages)
  const mountedRef = useMountedRef()
  const messageStateRef = useRef<{
    messages: UiMessage[]
    isLoading: boolean
    error: any
  }>({ messages: [], isLoading: true, error: null })

  return {
    realtimeMessages,
    setRealtimeMessages,
    mountedRef,
    messageStateRef
  }
} 
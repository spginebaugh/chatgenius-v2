"use client"

import { useEffect, useRef, useMemo } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { SubscriptionRefs } from './types'

export function useSubscriptionRefs() {
  const messageRef = useRef<RealtimeChannel | null>(null)
  const reactionRef = useRef<RealtimeChannel | null>(null)
  const currentUserIdRef = useRef<string | null>(null)

  return useMemo(() => ({
    messageRef,
    reactionRef,
    currentUserIdRef
  }), [])
}

export function useSubscriptionParams({
  channelId,
  receiverId,
  parentMessageId
}: {
  channelId?: number
  receiverId?: string
  parentMessageId?: number
}) {
  const paramsRef = useRef({
    channelId,
    receiverId,
    parentMessageId
  })
  
  useEffect(() => {
    if (
      paramsRef.current.channelId !== channelId ||
      paramsRef.current.receiverId !== receiverId ||
      paramsRef.current.parentMessageId !== parentMessageId
    ) {
      paramsRef.current = {
        channelId,
        receiverId,
        parentMessageId
      }
    }
  }, [channelId, receiverId, parentMessageId])

  return paramsRef
}

export function useMountedRef() {
  const mountedRef = useRef(true)
  
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  return mountedRef
} 
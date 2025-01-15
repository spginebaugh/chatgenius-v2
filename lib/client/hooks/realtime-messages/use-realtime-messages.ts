"use client"

import { useEffect, useMemo } from 'react'
import type { UiMessage } from '@/types/messages-ui'
import { useMessages } from '../messages'
import { useSubscriptionRefs, useSubscriptionParams } from './subscription-hooks'
import { useMessageState } from './message-state'
import { useMessageSync } from './message-sync'
import { useSubscriptionSetup } from './subscription-setup'

export function useRealtimeMessages({
  channelId,
  receiverId,
  parentMessageId,
  initialMessages = [],
  onNewMessage,
  onMessageDelete,
  onMessageUpdate,
  onReactionUpdate
}: {
  channelId?: number
  receiverId?: string
  parentMessageId?: number
  initialMessages?: UiMessage[]
  onNewMessage?: (message: any) => void
  onMessageDelete?: (message: any) => void
  onMessageUpdate?: (message: any) => void
  onReactionUpdate?: (messageId: number, reactions: any[]) => void
}) {
  const { messages, isLoading, error } = useMessages({ 
    channelId, 
    receiverId, 
    parentMessageId, 
    initialMessages 
  })

  const refs = useSubscriptionRefs()
  const params = useSubscriptionParams({ channelId, receiverId, parentMessageId })
  
  // Memoize callbacks to prevent unnecessary re-renders
  const callbacks = useMemo(() => ({
    onNewMessage,
    onMessageDelete,
    onMessageUpdate,
    onReactionUpdate
  }), [onNewMessage, onMessageDelete, onMessageUpdate, onReactionUpdate])

  const { 
    realtimeMessages, 
    setRealtimeMessages, 
    mountedRef,
    messageStateRef 
  } = useMessageState(messages)

  // Memoize the message state to prevent unnecessary updates
  const currentMessageState = useMemo(() => ({
    messages,
    isLoading,
    error
  }), [messages, isLoading, error])

  // Only update ref if state has actually changed
  useEffect(() => {
    const prevState = messageStateRef.current
    if (
      prevState.messages !== currentMessageState.messages ||
      prevState.isLoading !== currentMessageState.isLoading ||
      prevState.error !== currentMessageState.error
    ) {
      messageStateRef.current = currentMessageState
    }
  }, [currentMessageState])

  useMessageSync({
    messages,
    realtimeMessages,
    setRealtimeMessages,
    mountedRef,
    callbacks // Pass memoized callbacks
  })

  useSubscriptionSetup({
    refs,
    params,
    mountedRef,
    setRealtimeMessages,
    callbacks // Pass memoized callbacks
  })

  return {
    messages: realtimeMessages,
    isLoading,
    error
  }
} 
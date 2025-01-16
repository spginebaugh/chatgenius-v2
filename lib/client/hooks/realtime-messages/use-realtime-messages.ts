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
  const { messages, isLoading: fetchLoading, error: fetchError } = useMessages({ 
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
    isLoading,
    setIsLoading,
    error,
    setError
  } = useMessageState(messages)

  // Update loading and error states from fetch
  useEffect(() => {
    setIsLoading(fetchLoading)
    setError(fetchError)
  }, [fetchLoading, fetchError])

  useSubscriptionSetup({
    refs,
    params,
    setRealtimeMessages,
    callbacks
  })

  return {
    messages: realtimeMessages,
    isLoading,
    error
  }
} 
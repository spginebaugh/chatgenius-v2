"use client"

import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useMessagesStore } from '@/lib/stores/messages/index'
import type { UseRealtimeMessagesParams } from './types'
import { cleanupSubscriptions, initializeSubscriptionContext, subscribeToMessages, subscribeToReactions } from './subscription-handlers'

export function useRealtimeMessages({
  channelId,
  receiverId,
  parentMessageId,
  onNewMessage,
  onMessageDelete,
  onMessageUpdate,
  onReactionUpdate
}: UseRealtimeMessagesParams) {
  const messageSubscriptionRef = useRef<RealtimeChannel | null>(null)
  const reactionSubscriptionRef = useRef<RealtimeChannel | null>(null)
  const currentUserIdRef = useRef<string | null>(null)
  
  const { addMessage, updateReactions, deleteMessage } = useMessagesStore()

  useEffect(() => {
    const refs = {
      messageRef: messageSubscriptionRef,
      reactionRef: reactionSubscriptionRef,
      currentUserIdRef
    }

    const setupSubscriptions = async () => {
      cleanupSubscriptions(refs)
      const context = await initializeSubscriptionContext({
        channelId,
        receiverId,
        parentMessageId,
        refs
      })
      if (!context) return
      
      subscribeToMessages({
        context,
        refs,
        addMessage,
        deleteMessage
      })
      subscribeToReactions({
        context,
        refs,
        updateReactions
      })
    }

    setupSubscriptions().catch(error => {
      console.error('Error setting up subscriptions:', error)
    })

    return () => cleanupSubscriptions(refs)
  }, [channelId, receiverId, parentMessageId, addMessage, updateReactions, deleteMessage])
}

// Re-export types
export * from './types' 
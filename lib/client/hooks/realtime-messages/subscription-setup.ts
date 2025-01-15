"use client"

import { useEffect, useMemo } from 'react'
import type { UiMessage } from '@/types/messages-ui'
import type { SubscriptionRefs, SubscriptionContext, MessageCallbacks } from './types'
import { initializeSubscriptionContext } from './subscription-context'
import { setupMessageSubscription, setupReactionSubscription } from './setup-handlers'
import { createMessageHandlers, createReactionHandlers } from './message-handlers'
import { useSubscriptionParams } from './subscription-hooks'

export function cleanupSubscriptions(refs: SubscriptionRefs) {
  console.debug('[Realtime] Cleaning up subscriptions')
  
  if (refs.messageRef.current) {
    console.debug('[Realtime] Unsubscribing from message channel')
    refs.messageRef.current.unsubscribe()
    refs.messageRef.current = null
  }
  if (refs.reactionRef.current) {
    console.debug('[Realtime] Unsubscribing from reaction channel')
    refs.reactionRef.current.unsubscribe()
    refs.reactionRef.current = null
  }
}

async function setupAllSubscriptions(
  context: SubscriptionContext,
  refs: SubscriptionRefs,
  messageHandlers: ReturnType<typeof createMessageHandlers>,
  reactionHandlers: ReturnType<typeof createReactionHandlers>
) {
  setupMessageSubscription({
    context,
    refs,
    messageKey: context.storeKey,
    messageType: context.messageType,
    ...messageHandlers
  })

  setupReactionSubscription({
    context,
    refs,
    messageKey: context.storeKey,
    messageType: context.messageType,
    ...reactionHandlers
  })
}

export function useSubscriptionSetup({
  refs,
  params,
  mountedRef,
  setRealtimeMessages,
  callbacks
}: {
  refs: SubscriptionRefs
  params: ReturnType<typeof useSubscriptionParams>
  mountedRef: React.MutableRefObject<boolean>
  setRealtimeMessages: React.Dispatch<React.SetStateAction<UiMessage[]>>
  callbacks: MessageCallbacks
}) {
  const messageHandlers = useMemo(() => createMessageHandlers(setRealtimeMessages), [setRealtimeMessages])
  const reactionHandlers = useMemo(() => createReactionHandlers(setRealtimeMessages), [setRealtimeMessages])

  const setupSubscriptions = useMemo(() => async () => {
    if (!mountedRef.current) return

    const context = await initializeSubscriptionContext({
      ...params.current,
      refs
    })

    if (!context) return

    await setupAllSubscriptions(
      context,
      refs,
      messageHandlers,
      reactionHandlers
    )
  }, [messageHandlers, reactionHandlers, mountedRef])

  useEffect(() => {
    setupSubscriptions()
    return () => cleanupSubscriptions(refs)
  }, [setupSubscriptions])
} 
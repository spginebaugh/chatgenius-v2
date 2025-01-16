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
  console.debug('[Realtime] Setting up all subscriptions:', context)

  // Setup message subscription first and await it
  await setupMessageSubscription({
    context,
    refs,
    messageKey: context.storeKey,
    messageType: context.messageType,
    ...messageHandlers
  })

  // Only setup reaction subscription after message subscription is established
  await setupReactionSubscription({
    context,
    refs,
    messageKey: context.storeKey,
    messageType: context.messageType,
    ...reactionHandlers
  })

  console.debug('[Realtime] All subscriptions setup complete')
}

export function useSubscriptionSetup({
  refs,
  params,
  setRealtimeMessages,
  callbacks
}: {
  refs: SubscriptionRefs
  params: ReturnType<typeof useSubscriptionParams>
  setRealtimeMessages: React.Dispatch<React.SetStateAction<UiMessage[]>>
  callbacks: MessageCallbacks
}) {
  const messageHandlers = useMemo(() => 
    createMessageHandlers(setRealtimeMessages),
    [setRealtimeMessages]
  )

  const reactionHandlers = useMemo(() => 
    createReactionHandlers(setRealtimeMessages),
    [setRealtimeMessages]
  )

  useEffect(() => {
    let mounted = true
    let setupPromise: Promise<void> | null = null
    
    async function initAndSetupSubscriptions() {
      try {
        console.debug('[Realtime] Initializing subscription context')
        const context = await initializeSubscriptionContext({ ...params, refs })
        if (!mounted || !context) return
        
        console.debug('[Realtime] Context initialized, setting up subscriptions')
        await setupAllSubscriptions(context, refs, messageHandlers, reactionHandlers)
        console.debug('[Realtime] Subscriptions setup complete')
      } catch (error) {
        console.error('[Realtime] Error setting up subscriptions:', error)
      }
    }

    setupPromise = initAndSetupSubscriptions()
    
    return () => {
      mounted = false
      if (setupPromise) {
        setupPromise.finally(() => {
          if (!mounted) {
            cleanupSubscriptions(refs)
          }
        })
      }
    }
  }, [params, refs, messageHandlers, reactionHandlers])
} 
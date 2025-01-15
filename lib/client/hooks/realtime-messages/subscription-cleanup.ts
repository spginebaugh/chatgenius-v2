import type { SubscriptionRefs } from './types'

export function cleanupSubscriptions(refs: SubscriptionRefs) {
  if (refs.messageRef.current) {
    refs.messageRef.current.unsubscribe()
    refs.messageRef.current = null
  }
  if (refs.reactionRef.current) {
    refs.reactionRef.current.unsubscribe()
    refs.reactionRef.current = null
  }
} 
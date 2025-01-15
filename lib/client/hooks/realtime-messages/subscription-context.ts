import type { SubscriptionContext, SubscriptionRefs } from './types'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    console.error('No user found:', error)
    return null
  }
  return user
}

function buildMessageFilter({
  channelId,
  receiverId,
  parentMessageId,
  userId
}: {
  channelId?: number
  receiverId?: string
  parentMessageId?: number
  userId: string
}): string {
  if (channelId) {
    return `channel_id=eq.${channelId}&message_type=eq.channel`
  }
  if (receiverId) {
    return `message_type=eq.direct&or=(sender_id.eq.${receiverId},receiver_id.eq.${receiverId})`
  }
  if (parentMessageId) {
    return `parent_message_id=eq.${parentMessageId}`
  }
  throw new Error('No valid filter parameters provided')
}

function determineMessageContext({
  channelId,
  receiverId,
  parentMessageId
}: {
  channelId?: number
  receiverId?: string
  parentMessageId?: number
}): { messageType: 'channels' | 'dms' | 'threads'; storeKey: string | number } {
  if (channelId) {
    return { messageType: 'channels', storeKey: channelId }
  }
  if (receiverId) {
    return { messageType: 'dms', storeKey: receiverId }
  }
  if (parentMessageId) {
    return { messageType: 'threads', storeKey: parentMessageId }
  }
  throw new Error('No valid context parameters provided')
}

export async function initializeSubscriptionContext({
  channelId,
  receiverId,
  parentMessageId,
  refs
}: {
  channelId?: number
  receiverId?: string
  parentMessageId?: number
  refs: SubscriptionRefs
}): Promise<SubscriptionContext | null> {
  const user = await getCurrentUser()
  if (!user) return null
  
  refs.currentUserIdRef.current = user.id

  try {
    const { messageType, storeKey } = determineMessageContext({ channelId, receiverId, parentMessageId })

    return { 
      messageType, 
      storeKey, 
      currentUserId: user.id,
      channelId,
      receiverId,
      parentMessageId
    }
  } catch (error) {
    console.error('Error initializing subscription context:', error)
    return null
  }
} 
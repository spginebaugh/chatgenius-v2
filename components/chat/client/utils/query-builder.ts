import type { MessageType } from '@/types/database'
import type { QueryConfig } from '../types'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export function buildMessageQuery({
  currentUser,
  currentChannelId,
  currentDmUserId,
  parentMessageId
}: {
  currentUser: { user_id: string }
  currentChannelId?: number
  currentDmUserId?: string
  parentMessageId?: number
}): QueryConfig {
  let messageType: MessageType = 'channel'
  let storeKey: string | number
  let query = supabase.from('messages').select('*')

  if (parentMessageId) {
    messageType = 'thread'
    storeKey = parentMessageId
    query = query.eq('parent_message_id', parentMessageId)
  } else if (currentDmUserId) {
    messageType = 'direct'
    storeKey = currentDmUserId
    query = query.eq('message_type', 'direct')
      .or(`and(user_id.eq.${currentUser.user_id},receiver_id.eq.${currentDmUserId}),and(user_id.eq.${currentDmUserId},receiver_id.eq.${currentUser.user_id})`)
  } else if (currentChannelId) {
    messageType = 'channel'
    storeKey = currentChannelId
    query = query.eq('channel_id', currentChannelId)
      .eq('message_type', 'channel')
  } else {
    throw new Error('No valid message context provided')
  }

  return {
    messageType,
    storeKey,
    query
  }
} 
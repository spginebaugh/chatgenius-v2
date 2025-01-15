import type { DbMessage, UserStatus } from '@/types/database'
import type { UiMessage } from '@/types/messages-ui'
import type { SubscriptionContext } from './types'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function fetchFullMessage(messageId: number) {
  const { data: messageData, error: messageError } = await supabase
    .from('messages')
    .select(`
      *,
      profiles:users!messages_user_id_fkey(
        id,
        username,
        profile_picture_url,
        status
      ),
      reactions:message_reactions(*),
      thread_messages:messages!parent_message_id(
        *,
        profiles:users!messages_user_id_fkey(
          id,
          username,
          profile_picture_url,
          status
        )
      )
    `)
    .eq('id', messageId)
    .single()

  if (messageError) {
    console.error('Error fetching message:', messageError)
    return null
  }

  return messageData
}

export function formatMessageForUi(messageData: any): UiMessage {
  return {
    ...messageData,
    profiles: messageData.profiles || {
      id: messageData.user_id,
      username: 'Unknown'
    },
    reactions: messageData.reactions || [],
    thread_messages: messageData.thread_messages?.map((threadMsg: DbMessage & { 
      profiles?: { 
        id: string
        username: string | null
        profile_picture_url?: string | null
        status?: UserStatus 
      } 
    }) => ({
      ...threadMsg,
      profiles: threadMsg.profiles || {
        id: threadMsg.user_id,
        username: 'Unknown',
        profile_picture_url: null,
        status: 'OFFLINE' as const
      },
      reactions: [],
      thread_count: 0
    })) || []
  }
}

export function isMessageInContext(messageData: any, context: SubscriptionContext): boolean {
  // Check channel messages
  if (context.channelId) {
    return messageData.channel_id === context.channelId && 
           messageData.message_type === 'channel'
  }
  
  // Check direct messages
  if (context.receiverId && context.currentUserId) {
    return messageData.message_type === 'direct' && (
      (messageData.sender_id === context.receiverId && messageData.receiver_id === context.currentUserId) ||
      (messageData.sender_id === context.currentUserId && messageData.receiver_id === context.receiverId)
    )
  }
  
  // Check thread messages
  if (context.parentMessageId) {
    return messageData.parent_message_id === context.parentMessageId
  }
  
  return false
} 
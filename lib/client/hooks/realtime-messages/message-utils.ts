import type { DbMessage, UserStatus } from '@/types/database'
import type { UiMessage, UiProfile } from '@/types/messages-ui'
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
      files:message_files(*),
      thread_messages:messages!parent_message_id(
        *,
        profiles:users!messages_user_id_fkey(
          user_id,
          username,
          profile_picture_url,
          status
        )
      )
    `)
    .eq('message_id', messageId)
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
      user_id: messageData.user_id,
      username: 'Unknown'
    },
    reactions: messageData.reactions || [],
    files: (messageData.files || []).map((file: any) => ({
      url: file.file_url,
      type: file.file_type,
      name: file.name || 'file',
      vector_status: file.vector_status
    })),
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
        user_id: threadMsg.user_id,
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

export function formatMessageWithProfile(messageData: DbMessage, profile: UiProfile | null): UiMessage {
  return {
    message_id: messageData.message_id,
    message: messageData.message || '',
    message_type: messageData.message_type,
    user_id: messageData.user_id,
    channel_id: messageData.channel_id,
    receiver_id: messageData.receiver_id,
    parent_message_id: messageData.parent_message_id,
    thread_count: messageData.thread_count,
    inserted_at: messageData.inserted_at,
    profiles: {
      user_id: profile?.user_id || messageData.user_id,
      username: profile?.username || 'Unknown',
      profile_picture_url: profile?.profile_picture_url || null,
      status: profile?.status || 'OFFLINE'
    },
    files: [],
    reactions: []
  }
}

export function formatThreadMessage(threadMsg: DbMessage, profile: UiProfile | null): UiMessage {
  return {
    message_id: threadMsg.message_id,
    message: threadMsg.message || '',
    message_type: threadMsg.message_type,
    user_id: threadMsg.user_id,
    channel_id: threadMsg.channel_id,
    receiver_id: threadMsg.receiver_id,
    parent_message_id: threadMsg.parent_message_id,
    thread_count: threadMsg.thread_count,
    inserted_at: threadMsg.inserted_at,
    profiles: {
      user_id: profile?.user_id || threadMsg.user_id,
      username: profile?.username || 'Unknown',
      profile_picture_url: profile?.profile_picture_url || null,
      status: profile?.status || 'OFFLINE'
    },
    files: [],
    reactions: []
  }
} 
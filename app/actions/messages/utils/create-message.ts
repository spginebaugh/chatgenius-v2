import type { MessageData } from '../types'

export function createMessageData(params: {
  message: string
  userId: string
  channelId?: number | null
  receiverId?: string | null
  parentMessageId?: number | null
}): MessageData {
  const { message, userId, channelId, receiverId, parentMessageId } = params
  
  if (parentMessageId) {
    return {
      message,
      message_type: 'thread',
      user_id: userId,
      parent_message_id: typeof parentMessageId === 'string' ? parseInt(parentMessageId, 10) : parentMessageId,
      channel_id: null,
      receiver_id: null,
      thread_count: 0,
      inserted_at: new Date().toISOString()
    }
  }
  
  if (channelId) {
    return {
      message,
      message_type: 'channel',
      user_id: userId,
      channel_id: channelId,
      receiver_id: null,
      parent_message_id: null,
      thread_count: 0,
      inserted_at: new Date().toISOString()
    }
  }
  
  if (receiverId) {
    return {
      message,
      message_type: 'direct',
      user_id: userId,
      receiver_id: receiverId,
      channel_id: null,
      parent_message_id: null,
      thread_count: 0,
      inserted_at: new Date().toISOString()
    }
  }
  
  throw new Error('Invalid message parameters')
} 
import { DbMessage as Message } from '@/types/database'
import { UiFileAttachment } from '@/types/messages-ui'
import { insertRecord } from '../../supabase'
import { revalidatePath } from 'next/cache'
import { handleFileAttachments } from './file-attachments'

interface MessageBase {
  message: string
  files?: UiFileAttachment[]
}

interface SendChannelMessageProps extends MessageBase {
  channelId: number
  userId: string
}

interface SendDirectMessageProps extends MessageBase {
  receiverId: string
  userId: string
}

interface SendThreadMessageProps extends MessageBase {
  parentId: number
  userId: string
}

/**
 * Sends a message to a channel
 */
export async function sendChannelMessage({ 
  channelId, 
  message,
  files,
  userId
}: SendChannelMessageProps) {
  // Insert the message
  const messageData = await insertRecord<Message>({
    table: 'messages',
    data: {
      channel_id: channelId,
      user_id: userId,
      message,
      message_type: 'channel',
      inserted_at: new Date().toISOString()
    },
    select: 'message_id',
    options: {
      revalidatePath: '/channel/[id]'
    }
  })

  // Handle file attachments if present
  if (files?.length) {
    await handleFileAttachments({
      messageId: messageData.message_id,
      files,
      userId
    })
  }

  return messageData
}

/**
 * Sends a direct message to another user
 */
export async function sendDirectMessage({ 
  receiverId, 
  message,
  files,
  userId
}: SendDirectMessageProps) {
  // Insert the message
  const messageData = await insertRecord<Message>({
    table: 'messages',
    data: {
      user_id: userId,
      receiver_id: receiverId,
      message,
      message_type: 'direct',
      inserted_at: new Date().toISOString()
    },
    select: 'message_id',
    options: {
      revalidatePath: '/dm/[id]'
    }
  })

  // Handle file attachments if present
  if (files?.length) {
    await handleFileAttachments({
      messageId: messageData.message_id,
      files,
      userId
    })
  }

  return messageData
}

/**
 * Sends a message in a thread
 */
export async function sendThreadMessage({ 
  parentId,
  message,
  files,
  userId
}: SendThreadMessageProps) {
  // Insert the message
  const messageData = await insertRecord<Message>({
    table: 'messages',
    data: {
      parent_message_id: parentId,
      user_id: userId,
      message,
      message_type: 'thread',
      inserted_at: new Date().toISOString()
    },
    select: 'message_id',
    options: {
      // Revalidate the primary path
      revalidatePath: '/channel/[id]'
    }
  })

  // Handle file attachments if present
  if (files?.length) {
    await handleFileAttachments({
      messageId: messageData.message_id,
      files,
      userId
    })
  }

  // Revalidate all paths that might display this thread message
  revalidatePath('/channel/[id]')
  revalidatePath('/dm/[id]')
  revalidatePath('/thread/[id]')
  revalidatePath('/messages/[id]')  // If you have a dedicated message view
  
  return messageData
} 
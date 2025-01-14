import { DbMessage as Message, MessageFile, MessageType } from '@/types/database'
import { insertRecord } from './supabase-helpers'
import { createClient } from '@/app/_lib/supabase-server'
import { revalidatePath } from 'next/cache'

export interface FileAttachment {
  url: string
  type: string
  name: string
}

interface MessageBase {
  message: string
  files?: FileAttachment[]
}

interface HandleFileAttachmentsProps {
  messageId: number
  files: FileAttachment[]
  userId: string
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

interface FormatMessageProps {
  message: Message
}

interface FormatReactionsProps {
  reactions: Array<{
    emoji: string
    user_id: string
  }>
  currentUserId: string
}

/**
 * Handles file attachments for messages
 */
async function handleFileAttachments({
  messageId,
  files,
  userId
}: HandleFileAttachmentsProps) {
  const fileRecords = files.map(file => ({
    message_id: messageId,
    file_url: file.url,
    file_type: 'document' as const,
    inserted_at: new Date().toISOString()
  }))

  // Insert first file using our helper
  await insertRecord<MessageFile>({
    table: 'message_files',
    data: fileRecords[0],
    options: {
      revalidatePath: '/channel/[id]'
    }
  })

  // Insert remaining files if any
  if (fileRecords.length > 1) {
    const supabase = await createClient()
    const { error } = await supabase.from('message_files').insert(fileRecords.slice(1))
    if (error) throw error
  }
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
      message_type: 'channel' as MessageType,
      inserted_at: new Date().toISOString()
    },
    select: 'id',
    options: {
      revalidatePath: '/channel/[id]'
    }
  })

  // Handle file attachments if present
  if (files?.length) {
    await handleFileAttachments({
      messageId: messageData.id,
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
      message_type: 'direct' as MessageType,
      inserted_at: new Date().toISOString()
    },
    select: 'id',
    options: {
      revalidatePath: '/dm/[id]'
    }
  })

  // Handle file attachments if present
  if (files?.length) {
    await handleFileAttachments({
      messageId: messageData.id,
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
      message_type: 'thread' as MessageType,
      inserted_at: new Date().toISOString()
    },
    select: 'id',
    options: {
      // Revalidate the primary path
      revalidatePath: '/channel/[id]'
    }
  })

  // Handle file attachments if present
  if (files?.length) {
    await handleFileAttachments({
      messageId: messageData.id,
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

/**
 * Formats a message for display
 */
export function formatMessageForDisplay({ message }: FormatMessageProps) {
  if (!message) {
    return {
      id: 0,
      message: '',
      inserted_at: new Date().toISOString(),
    }
  }

  return {
    id: message.id || 0,
    message: message.message || '',
    inserted_at: message.inserted_at || new Date().toISOString(),
  }
}

/**
 * Formats reactions for a message
 */
export function formatReactions({ reactions, currentUserId }: FormatReactionsProps) {
  // Group reactions by emoji
  const reactionsByEmoji = new Map<string, Set<string>>()
  
  reactions.forEach(reaction => {
    if (!reactionsByEmoji.has(reaction.emoji)) {
      reactionsByEmoji.set(reaction.emoji, new Set())
    }
    reactionsByEmoji.get(reaction.emoji)!.add(reaction.user_id)
  })

  // Format reactions for display
  return Array.from(reactionsByEmoji.entries()).map(([emoji, users]) => ({
    emoji,
    count: users.size,
    reacted_by_me: users.has(currentUserId)
  }))
} 
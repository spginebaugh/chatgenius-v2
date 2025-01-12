import { ChannelMessage, DirectMessage, ThreadMessage, File, EmojiReaction } from '@/types/database'
import { insertRecord } from './supabase-helpers'
import { createClient } from '@/utils/supabase/server'
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
  messageType: 'channel_message' | 'direct_message' | 'thread_message'
  files: FileAttachment[]
  userId: string
}

interface SendChannelMessageProps extends MessageBase {
  channelId: string
  userId: string
}

interface SendDirectMessageProps extends MessageBase {
  receiverId: string
  userId: string
}

interface SendThreadMessageProps extends MessageBase {
  parentId: number
  parentType: 'channel_message' | 'direct_message'
  userId: string
}

interface FormatMessageProps {
  message: ChannelMessage | DirectMessage | ThreadMessage
}

interface FormatReactionsProps {
  reactions: Array<{
    emoji: string
    user_id: string
    parent_type: 'channel_message' | 'direct_message' | 'thread_message'
  }>
  currentUserId: string
  expectedParentType: 'channel_message' | 'direct_message' | 'thread_message'
}

/**
 * Handles file attachments for messages
 */
async function handleFileAttachments({
  messageId,
  messageType,
  files,
  userId
}: HandleFileAttachmentsProps) {
  const fileRecords = files.map(file => ({
    message_id: messageId,
    message_type: messageType,
    url: file.url,
    file_type: 'document' as const,
    file_name: file.name,
    user_id: userId
  }))

  // Insert first file using our helper
  await insertRecord<File>({
    table: 'files',
    data: fileRecords[0],
    options: {
      revalidatePath: '/channel/[id]'
    }
  })

  // Insert remaining files if any
  if (fileRecords.length > 1) {
    const supabase = await createClient()
    const { error } = await supabase.from('files').insert(fileRecords.slice(1))
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
  const messageData = await insertRecord<ChannelMessage>({
    table: 'channel_messages',
    data: {
      channel_id: parseInt(channelId),
      user_id: userId,
      message
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
      messageType: 'channel_message',
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
  const messageData = await insertRecord<DirectMessage>({
    table: 'direct_messages',
    data: {
      sender_id: userId,
      receiver_id: receiverId,
      message
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
      messageType: 'direct_message',
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
  parentType,
  message,
  files,
  userId
}: SendThreadMessageProps) {
  // Insert the message
  const messageData = await insertRecord<ThreadMessage>({
    table: 'thread_messages',
    data: {
      parent_id: parentId,
      parent_type: parentType,
      user_id: userId,
      message
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
      messageType: 'thread_message',
      files,
      userId
    })
  }

  // Revalidate both paths since threads can be in either channels or DMs
  revalidatePath('/dm/[id]')
  
  return messageData
}

/**
 * Formats a message for display
 */
export function formatMessageForDisplay({ message }: FormatMessageProps) {
  if (!message) {
    return {
      id: '',
      message: '',
      inserted_at: new Date().toISOString(),
    }
  }

  return {
    id: message.message_id?.toString() || '',
    message: message.message || '',
    inserted_at: message.inserted_at || new Date().toISOString(),
  }
}

/**
 * Formats reactions for a message
 */
export function formatReactions({ reactions, currentUserId, expectedParentType }: FormatReactionsProps) {
  // Group reactions by emoji, but only for the expected parent type
  const reactionsByEmoji = new Map<string, Set<string>>()
  
  reactions
    .filter(reaction => reaction.parent_type === expectedParentType)
    .forEach(reaction => {
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
"use server"

import { createClient } from '@/app/_lib/supabase-server'
import { requireAuth } from '@/app/_lib/auth'
import { insertRecord } from '@/app/_lib/supabase-helpers'
import type { DbMessage, MessageType, MessageFile } from '@/types/database'
import type { FileAttachment } from '@/app/_lib/message-helpers'
import { revalidatePath } from 'next/cache'

interface SendMessageProps {
  message: string
  files?: FileAttachment[]
  channelId?: number
  receiverId?: string
  parentMessageId?: number
}

export async function sendMessage({ 
  message, 
  files, 
  channelId, 
  receiverId, 
  parentMessageId 
}: SendMessageProps) {
  const user = await requireAuth({ throwOnMissingProfile: true })
  
  let messageType: MessageType
  if (parentMessageId) {
    messageType = 'thread'
  } else if (channelId) {
    messageType = 'channel'
  } else if (receiverId) {
    messageType = 'direct'
  } else {
    throw new Error('Invalid message parameters')
  }

  // Insert the message
  const messageData = await insertRecord<DbMessage>({
    table: 'messages',
    data: {
      message,
      message_type: messageType,
      user_id: user.id,
      channel_id: channelId,
      receiver_id: receiverId,
      parent_message_id: parentMessageId,
      thread_count: 0,
      inserted_at: new Date().toISOString()
    },
    select: 'id',
    options: {
      revalidatePath: channelId ? `/channel/${channelId}` : receiverId ? `/dm/${receiverId}` : undefined,
      errorMap: {
        NOT_FOUND: {
          message: 'Failed to send message',
          status: 500
        }
      }
    }
  })

  // Handle file attachments if present
  if (files?.length) {
    const fileRecords = files.map(file => ({
      message_id: messageData.id,
      file_url: file.url,
      file_type: 'document' as const,
      inserted_at: new Date().toISOString()
    }))

    await insertRecord<MessageFile>({
      table: 'message_files',
      data: fileRecords[0],
      options: {
        revalidatePath: channelId ? `/channel/${channelId}` : receiverId ? `/dm/${receiverId}` : undefined,
        errorMap: {
          NOT_FOUND: {
            message: 'Failed to attach file',
            status: 500
          }
        }
      }
    })

    // Insert remaining files if any
    if (fileRecords.length > 1) {
      for (const fileRecord of fileRecords.slice(1)) {
        await insertRecord<MessageFile>({
          table: 'message_files',
          data: fileRecord,
          options: {
            revalidatePath: channelId ? `/channel/${channelId}` : receiverId ? `/dm/${receiverId}` : undefined,
            errorMap: {
              NOT_FOUND: {
                message: 'Failed to attach file',
                status: 500
              }
            }
          }
        })
      }
    }
  }

  return messageData
} 
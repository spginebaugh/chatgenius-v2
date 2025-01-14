"use server"

import { createClient } from '@/app/_lib/supabase-server'
import { requireAuth } from '@/app/_lib/auth'
import { insertRecord } from '@/app/_lib/supabase'
import type { DbMessage, MessageType, MessageFile } from '@/types/database'
import type { FileAttachment } from '@/app/_lib/message-helpers'
import { revalidatePath } from 'next/cache'

// Types
interface SendMessageProps {
  message: string
  files?: FileAttachment[]
  channelId?: number
  receiverId?: string
  parentMessageId?: number
}

interface MessageData {
  message: string
  message_type: MessageType
  user_id: string
  channel_id?: number
  receiver_id?: string
  parent_message_id?: number
  thread_count: number
  inserted_at: string
}

interface FileData {
  message_id: number
  file_url: string
  file_type: 'document'
  inserted_at: string
}

// Helper Functions
function determineMessageType(props: Pick<SendMessageProps, 'channelId' | 'receiverId' | 'parentMessageId'>): MessageType {
  if (props.parentMessageId) return 'thread'
  if (props.channelId) return 'channel'
  if (props.receiverId) return 'direct'
  throw new Error('Invalid message parameters')
}

function getRevalidationPath(channelId?: number, receiverId?: string): string | undefined {
  if (channelId) return `/channel/${channelId}`
  if (receiverId) return `/dm/${receiverId}`
  return undefined
}

function createMessageData(props: SendMessageProps, userId: string): MessageData {
  return {
    message: props.message,
    message_type: determineMessageType(props),
    user_id: userId,
    channel_id: props.channelId,
    receiver_id: props.receiverId,
    parent_message_id: props.parentMessageId,
    thread_count: 0,
    inserted_at: new Date().toISOString()
  }
}

function createFileData(messageId: number, file: FileAttachment): FileData {
  return {
    message_id: messageId,
    file_url: file.url,
    file_type: 'document',
    inserted_at: new Date().toISOString()
  }
}

async function insertMessageFiles(files: FileAttachment[], messageId: number, revalidatePath?: string) {
  const fileRecords = files.map(file => createFileData(messageId, file))
  
  // Insert first file
  await insertRecord<MessageFile>({
    table: 'message_files',
    data: fileRecords[0],
    options: {
      revalidatePath,
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
    const insertPromises = fileRecords.slice(1).map(fileRecord => 
      insertRecord<MessageFile>({
        table: 'message_files',
        data: fileRecord,
        options: {
          revalidatePath,
          errorMap: {
            NOT_FOUND: {
              message: 'Failed to attach file',
              status: 500
            }
          }
        }
      })
    )
    await Promise.all(insertPromises)
  }
}

// Main Function
export async function sendMessage(props: SendMessageProps) {
  const user = await requireAuth({ throwOnMissingProfile: true })
  const revalidatePath = getRevalidationPath(props.channelId, props.receiverId)
  
  // Insert the message
  const messageData = await insertRecord<DbMessage>({
    table: 'messages',
    data: createMessageData(props, user.id),
    select: 'id',
    options: {
      revalidatePath,
      errorMap: {
        NOT_FOUND: {
          message: 'Failed to send message',
          status: 500
        }
      }
    }
  })

  // Handle file attachments if present
  if (props.files?.length) {
    await insertMessageFiles(props.files, messageData.id, revalidatePath)
  }

  return messageData
} 
"use server"

import { createClient } from '@/app/_lib/supabase-server'
import { requireAuth } from '@/app/_lib/auth'
import { insertRecord } from '@/app/_lib/supabase'
import type { DbMessage, MessageType, MessageFile, FileType } from '@/types/database'
import type { UiFileAttachment } from '@/types/messages-ui'
import type { MessageData } from '@/app/actions/messages/types'
import { revalidatePath } from 'next/cache'

// Types
interface SendMessageProps {
  message: string
  files?: UiFileAttachment[]
  channelId?: number
  receiverId?: string
  parentMessageId?: number
}

interface FileData {
  message_id: number
  file_url: string
  file_type: FileType
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
    channel_id: props.channelId || null,
    receiver_id: props.receiverId || null,
    parent_message_id: props.parentMessageId || null,
    thread_count: 0,
    inserted_at: new Date().toISOString()
  }
}

function createFileData(messageId: number, file: UiFileAttachment): FileData {
  return {
    message_id: messageId,
    file_url: file.url,
    file_type: file.type,
    inserted_at: new Date().toISOString()
  }
}

async function insertMessageFiles(files: UiFileAttachment[], messageId: number, revalidatePath?: string) {
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
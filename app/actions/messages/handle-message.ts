'use server'

import { createClient } from '@/app/_lib/supabase-server'
import { requireAuth } from '@/app/_lib/auth'
import type { MessageData, HandleMessageProps } from './types'
import type { DbMessage, FileType } from '@/types/database'
import type { UiMessage } from '@/types/messages-ui'

const MESSAGE_SELECT_QUERY = `
  *,
  profiles:user_id(*),
  reactions:message_reactions(*),
  files:message_files(*),
  thread_messages:messages!parent_message_id(
    *,
    profiles:user_id(*)
  )
`

function createMessageData(params: {
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

async function insertMessage(messageData: MessageData) {
  const supabase = await createClient()
  
  const { data: message, error } = await supabase
    .from('messages')
    .insert(messageData)
    .select(MESSAGE_SELECT_QUERY)
    .single()

  if (error) throw new Error(error.message)
  if (!message) throw new Error('Failed to create message')
  
  return message
}

async function processFileAttachment(params: {
  messageId: number
  file: { type: FileType; url: string }
}) {
  const { messageId, file } = params
  const supabase = await createClient()
  
  const { data: fileData, error: fileError } = await supabase
    .from('message_files')
    .insert({
      message_id: messageId,
      file_type: file.type,
      file_url: file.url,
      inserted_at: new Date().toISOString()
    })
    .select('*')
    .single()

  if (fileError) {
    console.error('Error inserting file:', { error: fileError, file, messageId })
    throw fileError
  }

  return fileData
}

async function refreshMessageWithFiles(messageId: number) {
  const supabase = await createClient()
  
  const { data: message, error } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT_QUERY)
    .eq('id', messageId)
    .single()

  if (error) throw new Error(error.message)
  if (!message) throw new Error('Failed to refresh message')
  
  return message
}

function formatMessageResponse(message: DbMessage & { 
  profiles?: any
  reactions?: any[]
  files?: any[]
  thread_messages?: any[]
}) {
  return {
    ...message,
    profiles: message.profiles || {
      id: message.user_id,
      username: 'Unknown'
    },
    reactions: message.reactions || [],
    files: message.files || [],
    thread_messages: message.thread_messages || []
  }
}

export async function handleMessage({ 
  message, 
  files, 
  channelId, 
  receiverId, 
  parentMessageId 
}: HandleMessageProps) {
  const user = await requireAuth({ throwOnMissingProfile: true })
  
  const messageData = createMessageData({
    message,
    userId: user.id,
    channelId,
    receiverId,
    parentMessageId
  })

  const insertedMessage = await insertMessage(messageData)

  if (files?.length) {
    try {
      await Promise.all(
        files.map(file => processFileAttachment({ 
          messageId: insertedMessage.id, 
          file 
        }))
      )
      const updatedMessage = await refreshMessageWithFiles(insertedMessage.id)
      return formatMessageResponse(updatedMessage)
    } catch (error) {
      console.error('Error handling file attachments:', error)
      throw error
    }
  }

  return formatMessageResponse(insertedMessage)
} 
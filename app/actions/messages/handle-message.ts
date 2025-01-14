'use server'

import { createClient } from '@/app/_lib/supabase-server'
import { requireAuth } from '@/app/_lib/auth'
import type { MessageData, HandleMessageProps } from './types'
import type { DbMessage, FileType } from '@/types/database'
import type { UiMessage } from '@/types/messages-ui'
import { processAndStoreFile, queryDocuments } from '@/lib/rag/rag-service'

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
  file: { type: FileType; url: string; name: string }
}) {
  const { messageId, file } = params
  const supabase = await createClient()
  
  // Insert file record with pending status
  const { data: fileData, error: fileError } = await supabase
    .from('message_files')
    .insert({
      message_id: messageId,
      file_type: file.type,
      file_url: file.url,
      vector_status: 'pending',
      inserted_at: new Date().toISOString()
    })
    .select('*')
    .single()

  if (fileError) {
    console.error('Error inserting file:', { error: fileError, file, messageId })
    throw fileError
  }

  // Only process PDFs and text files for RAG
  if (file.type === 'document' && (file.name.endsWith('.pdf') || file.name.endsWith('.txt'))) {
    try {
      // Update status to processing
      await supabase
        .from('message_files')
        .update({ vector_status: 'processing' })
        .eq('id', fileData.id)

      // Download file content
      const { data: fileContent, error: downloadError } = await supabase.storage
        .from('chat-attachments')
        .download(file.url.split('/').pop()!)

      if (downloadError) throw downloadError

      // Process file for RAG
      await processAndStoreFile(
        Buffer.from(await fileContent.arrayBuffer()),
        file.name,
        fileData.id
      )

      // Update status to completed
      await supabase
        .from('message_files')
        .update({ vector_status: 'completed' })
        .eq('id', fileData.id)

    } catch (error) {
      console.error('Error processing file for RAG:', error)
      // Update status to failed
      await supabase
        .from('message_files')
        .update({ vector_status: 'failed' })
        .eq('id', fileData.id)
    }
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
  parentMessageId,
  isRagQuery = false
}: HandleMessageProps) {
  const user = await requireAuth({ throwOnMissingProfile: true })
  
  if (isRagQuery) {
    // First store the user's query
    const userMessageData = createMessageData({
      message,
      userId: user.id,
      channelId,
      receiverId,
      parentMessageId
    })
    const userMessage = await insertMessage(userMessageData)

    // Then handle RAG query
    const response = await queryDocuments(message, user.id)
    
    // Create message with RAG response
    const responseMessageData = createMessageData({
      message: response.content,
      userId: process.env.RAG_BOT_USER_ID || user.id, // Use RAG bot user if configured
      channelId,
      receiverId,
      parentMessageId
    })

    // Set message type to 'rag'
    responseMessageData.message_type = 'rag'

    // Insert the response message
    const responseMessage = await insertMessage(responseMessageData)
    return formatMessageResponse(responseMessage)
  }

  // Handle regular message
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
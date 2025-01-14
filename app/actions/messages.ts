'use server'

import { revalidatePath } from "next/cache"
import { requireAuth } from '@/app/_lib/auth'
import { insertRecord } from '@/app/_lib/supabase-helpers'
import { createClient } from '@/app/_lib/supabase-server'
import type { FileAttachment } from '@/app/_lib/message-helpers'
import type { DbMessage, MessageType, MessageFile } from '@/types/database'

interface HandleMessageProps {
  message: string
  files?: FileAttachment[]
  channelId?: number
  receiverId?: string
  parentMessageId?: number
}

export async function handleMessage({ 
  message, 
  files, 
  channelId, 
  receiverId, 
  parentMessageId 
}: HandleMessageProps) {
  const user = await requireAuth({ throwOnMissingProfile: true })
  
  let messageType: MessageType
  let messageData: {
    message: string
    message_type: MessageType
    user_id: string
    channel_id?: number | null
    receiver_id?: string | null
    parent_message_id?: number | null
    thread_count: number
    inserted_at: string
  }

  // If it's a thread message, we only need the parent_message_id
  if (parentMessageId) {
    // Ensure parentMessageId is a number
    const numericParentId = typeof parentMessageId === 'string' ? parseInt(parentMessageId, 10) : parentMessageId
    
    messageType = 'thread'
    messageData = {
      message,
      message_type: messageType,
      user_id: user.id,
      parent_message_id: numericParentId,
      // Explicitly set these to null for thread messages
      channel_id: null,
      receiver_id: null,
      thread_count: 0,
      inserted_at: new Date().toISOString()
    }
  } else if (channelId) {
    messageType = 'channel'
    messageData = {
      message,
      message_type: messageType,
      user_id: user.id,
      channel_id: channelId,
      receiver_id: null,
      parent_message_id: null,
      thread_count: 0,
      inserted_at: new Date().toISOString()
    }
  } else if (receiverId) {
    messageType = 'direct'
    messageData = {
      message,
      message_type: messageType,
      user_id: user.id,
      receiver_id: receiverId,
      channel_id: null,
      parent_message_id: null,
      thread_count: 0,
      inserted_at: new Date().toISOString()
    }
  } else {
    throw new Error('Invalid message parameters')
  }

  const supabase = await createClient()
  
  // Insert the message directly using the Supabase client with explicit join
  const { data: insertedMessage, error: messageError } = await supabase
    .from('messages')
    .insert(messageData)
    .select(`
      *,
      profiles:user_id(*),
      reactions:message_reactions(*),
      files:message_files(*),
      thread_messages:messages!parent_message_id(
        *,
        profiles:user_id(*)
      )
    `)
    .single()

  if (messageError) {
    throw new Error(messageError.message)
  }

  if (!insertedMessage) {
    throw new Error('Failed to create message')
  }

  // If there are files, handle them separately
  if (files?.length) {
    console.log('Processing files:', files)
    
    // Handle file attachments
    const filePromises = files.map(async (file) => {
      console.log('Processing file:', file)
      
      // Map the file type to our database enum type
      let fileType: 'image' | 'video' | 'audio' | 'document' = 'document'
      if (file.type === 'image') fileType = 'image'
      else if (file.type === 'video') fileType = 'video'
      else if (file.type === 'audio') fileType = 'audio'

      console.log('Inserting file with data:', {
        message_id: insertedMessage.id,
        file_type: fileType,
        file_url: file.url
      })

      const { data: fileData, error: fileError } = await supabase
        .from('message_files')
        .insert({
          message_id: insertedMessage.id,
          file_type: fileType,
          file_url: file.url,
          inserted_at: new Date().toISOString()
        })
        .select('*')
        .single()

      if (fileError) {
        console.error('Error inserting file:', {
          error: fileError,
          file,
          messageId: insertedMessage.id
        })
        throw fileError
      }

      console.log('Successfully inserted file:', fileData)
      return fileData
    })

    try {
      const insertedFiles = await Promise.all(filePromises)
      console.log('All files processed:', insertedFiles)
      
      // Fetch the message again to get the updated files
      const { data: updatedMessage, error: refreshError } = await supabase
        .from('messages')
        .select(`
          *,
          profiles:user_id(*),
          reactions:message_reactions(*),
          files:message_files(*),
          thread_messages:messages!parent_message_id(
            *,
            profiles:user_id(*)
          )
        `)
        .eq('id', insertedMessage.id)
        .single()

      if (refreshError) {
        console.error('Error refreshing message:', refreshError)
      } else if (updatedMessage) {
        console.log('Updated message with files:', updatedMessage)
        return {
          ...updatedMessage,
          profiles: updatedMessage.profiles || {
            id: updatedMessage.user_id,
            username: 'Unknown'
          },
          reactions: updatedMessage.reactions || [],
          files: updatedMessage.files || [],
          thread_messages: updatedMessage.thread_messages || []
        }
      }
    } catch (error) {
      console.error('Error handling file attachments:', error)
      throw error
    }
  }

  // Transform the response to match the expected format
  const formattedMessage = {
    ...insertedMessage,
    profiles: insertedMessage.profiles || {
      id: insertedMessage.user_id,
      username: 'Unknown'
    },
    reactions: insertedMessage.reactions || [],
    files: insertedMessage.files || [],
    thread_messages: insertedMessage.thread_messages || []
  }

  return formattedMessage
}

export async function addEmojiReaction({
  messageId,
  emoji
}: {
  messageId: number
  emoji: string
}) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    console.log('Attempting to toggle reaction with params:', {
      p_message_id: messageId,
      p_emoji: emoji,
      p_user_id: user.id
    })

    // Use RPC for the toggle operation
    const { data, error } = await supabase.rpc('toggle_reaction', {
      p_message_id: messageId,
      p_emoji: emoji,
      p_user_id: user.id
    })

    console.log('Toggle reaction response:', { data, error })

    if (error) {
      throw new Error(`Failed to toggle reaction: ${error.message}`)
    }
  } catch (error) {
    console.error('Error in addEmojiReaction:', error)
    throw error
  }
} 
import { createClient } from '@/app/_lib/supabase-server'
import type { MessageData } from '../types'
import type { DbMessage } from '@/types/database'

export const MESSAGE_SELECT_QUERY = `
  *,
  profiles:users!messages_user_id_fkey(*),
  reactions:message_reactions(*),
  files:message_files(*),
  thread_messages:messages!parent_message_id(
    *,
    profiles:users!messages_user_id_fkey(*)
  )
`

export async function insertMessage(messageData: MessageData) {
  const supabase = await createClient()
  
  // First insert and get just the message_id
  const { data: messageId, error: insertError } = await supabase
    .from('messages')
    .insert(messageData)
    .select('message_id')
    .single()

  if (insertError) throw new Error(insertError.message)
  if (!messageId) throw new Error('Failed to create message')

  // Then fetch the full message with all relations
  const { data: message, error: fetchError } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT_QUERY)
    .eq('message_id', messageId.message_id)
    .single()

  if (fetchError) throw new Error(fetchError.message)
  if (!message) throw new Error('Failed to fetch message')
  
  return message
}

export async function refreshMessageWithFiles(messageId: number) {
  const supabase = await createClient()
  
  const { data: message, error } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT_QUERY)
    .eq('message_id', messageId)
    .single()

  if (error) throw new Error(error.message)
  if (!message) throw new Error('Failed to refresh message')
  
  return message
}

export function formatMessageResponse(message: DbMessage & { 
  profiles?: any
  reactions?: any[]
  files?: any[]
  thread_messages?: any[]
}) {
  return {
    ...message,
    profiles: message.profiles || {
      user_id: message.user_id,
      username: 'Unknown'
    },
    reactions: message.reactions || [],
    files: (message.files || []).map(file => ({
      url: file.file_url,
      type: file.file_type,
      name: file.name || 'file',
      vector_status: file.vector_status
    })),
    thread_messages: message.thread_messages || []
  }
}

export async function getMessage(messageId: number) {
  const supabase = await createClient()
  
  const { data: message, error } = await supabase
    .from('messages')
    .select('*')
    .eq('message_id', messageId)
    .single()

  if (error) throw new Error(error.message)
  if (!message) throw new Error('Failed to fetch message')
  
  return message
} 
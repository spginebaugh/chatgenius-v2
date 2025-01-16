import type { DbMessage, UserStatus, MessageFile } from '@/types/database'
import type { UiMessage } from '@/types/messages-ui'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

function getFileNameFromUrl(url: string): string {
  try {
    const urlParts = url.split('/')
    return urlParts[urlParts.length - 1] || 'file'
  } catch {
    return 'file'
  }
}

export async function convertToUiMessage(message: DbMessage, currentUserId: string): Promise<UiMessage> {
  // Fetch full message data with all relations
  const { data: messageData } = await supabase
    .from('messages')
    .select(`
      *,
      profiles:users!messages_user_id_fkey(
        user_id,
        username,
        profile_picture_url,
        status
      ),
      files:message_files(*),
      reactions:message_reactions(*),
      mentions:message_mentions(*)
    `)
    .eq('message_id', message.message_id)
    .single()

  if (!messageData) {
    // Fallback to basic message format if fetch fails
    return {
      message_id: message.message_id,
      message: message.message || '',
      message_type: message.message_type,
      user_id: message.user_id,
      channel_id: message.channel_id,
      receiver_id: message.receiver_id,
      parent_message_id: message.parent_message_id,
      thread_count: message.thread_count || 0,
      inserted_at: message.inserted_at,
      profiles: {
        user_id: message.user_id,
        username: 'Unknown',
        profile_picture_url: null,
        status: 'OFFLINE' as UserStatus
      },
      reactions: [],
      files: [],
      thread_messages: []
    }
  }

  // Format the message with all relations
  return {
    ...messageData,
    profiles: messageData.profiles || {
      user_id: messageData.user_id,
      username: 'Unknown',
      profile_picture_url: null,
      status: 'OFFLINE' as UserStatus
    },
    reactions: messageData.reactions || [],
    files: (messageData.files || []).map((file: MessageFile) => ({
      url: file.file_url,
      type: file.file_type,
      name: getFileNameFromUrl(file.file_url),
      vector_status: file.vector_status
    })),
    thread_messages: []
  }
} 
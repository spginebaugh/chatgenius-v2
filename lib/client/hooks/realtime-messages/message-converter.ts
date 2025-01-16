import type { DbMessage, MessageFile, FileType } from '@/types/database'
import type { UiMessage } from '@/types/messages-ui'
import { createClient } from '@/lib/supabase/client'
import { formatReactions } from '@/lib/stores/messages/utils'
import { createUiProfile } from './profile-utils'
import { MessageWithJoins } from "@/lib/client/hooks/messages/format-utils"

const supabase = createClient()

interface FileInfo {
  file_id: number
  file_type: FileType
  file_url: string
}

export async function convertToUiMessage(dbMessage: DbMessage, currentUserId: string): Promise<UiMessage> {
  // Fetch the complete message with joins
  const { data: messageWithJoins } = await supabase
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
      reactions:message_reactions(*)
    `)
    .eq('message_id', dbMessage.message_id)
    .single()

  if (!messageWithJoins) {
    // Fallback if joins fail - only use stable data from dbMessage
    return {
      ...dbMessage,
      message: dbMessage.message || '',
      profiles: createUiProfile(null, dbMessage.user_id),
      reactions: [],
      files: [],
      thread_messages: []
    }
  }

  // Format the message with all its relations
  // Only include stable data that comes from the database
  return {
    message_id: messageWithJoins.message_id,
    message: messageWithJoins.message || '',
    message_type: messageWithJoins.message_type,
    user_id: messageWithJoins.user_id,
    channel_id: messageWithJoins.channel_id,
    receiver_id: messageWithJoins.receiver_id,
    parent_message_id: messageWithJoins.parent_message_id,
    thread_count: messageWithJoins.thread_count,
    inserted_at: messageWithJoins.inserted_at,
    profiles: createUiProfile(messageWithJoins.profiles, messageWithJoins.user_id),
    reactions: formatReactions(messageWithJoins.reactions || [], currentUserId),
    files: ((messageWithJoins.files || []) as MessageFile[]).map(file => ({
      url: file.file_url,
      type: file.file_type,
      name: file.file_url.split('/').pop() || 'file'
    })),
    thread_messages: []
  }
}

export function convertMessageToUi(messageWithJoins: MessageWithJoins, currentUserId: string): UiMessage {
  return {
    message_id: messageWithJoins.message_id,
    message: messageWithJoins.message || '',
    message_type: messageWithJoins.message_type,
    user_id: messageWithJoins.user?.user_id || messageWithJoins.user_id,
    channel_id: messageWithJoins.channel_id,
    receiver_id: messageWithJoins.receiver_id,
    parent_message_id: messageWithJoins.parent_message_id,
    thread_count: messageWithJoins.thread_count,
    inserted_at: messageWithJoins.inserted_at,
    profiles: {
      user_id: messageWithJoins.user?.user_id || messageWithJoins.user_id,
      username: messageWithJoins.user?.username || 'Unknown',
      profile_picture_url: null,
      status: 'OFFLINE'
    },
    files: messageWithJoins.files?.map((file: FileInfo) => ({
      url: file.file_url,
      type: file.file_type,
      name: file.file_url.split('/').pop() || 'file'
    })) || [],
    reactions: formatReactions(messageWithJoins.reactions || [], currentUserId)
  }
} 
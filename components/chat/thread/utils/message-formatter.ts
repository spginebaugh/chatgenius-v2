import type { MessageFile } from "@/types/database"
import type { UiMessage } from "@/types/messages-ui"
import { formatReactions } from "@/lib/stores/messages/utils"

export const formatMessageWithJoins = (messageWithJoins: any, currentUserId: string): UiMessage => ({
  ...messageWithJoins,
  message: messageWithJoins.message || '',
  profiles: {
    id: messageWithJoins.profiles?.id || messageWithJoins.user_id,
    username: messageWithJoins.profiles?.username || 'Unknown',
    profile_picture_url: messageWithJoins.profiles?.profile_picture_url || null,
    status: messageWithJoins.profiles?.status || 'OFFLINE'
  },
  reactions: formatReactions(messageWithJoins.reactions || [], currentUserId),
  files: ((messageWithJoins.files || []) as MessageFile[]).map(file => ({
    url: file.file_url,
    type: file.file_type,
    name: file.file_url.split('/').pop() || 'file'
  })),
  thread_messages: []
}) 
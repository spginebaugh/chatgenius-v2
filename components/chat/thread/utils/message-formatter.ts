import { UiMessage } from "@/types/messages-ui"
import { MessageWithJoins } from "@/lib/client/hooks/messages/format-utils"
import { formatReactions } from "@/lib/stores/messages/utils"
import { FileType } from "@/types/database"

interface FileInfo {
  file_id: number
  file_type: FileType
  file_url: string
}

export function formatMessageWithJoins(messageWithJoins: MessageWithJoins, currentUserId: string): UiMessage {
  return {
    ...messageWithJoins,
    profiles: {
      user_id: messageWithJoins.profiles?.user_id || messageWithJoins.user_id,
      username: messageWithJoins.profiles?.username || 'Unknown',
      profile_picture_url: messageWithJoins.profiles?.profile_picture_url || null,
      status: messageWithJoins.profiles?.status || 'OFFLINE'
    },
    reactions: formatReactions(messageWithJoins.reactions || [], currentUserId),
    files: messageWithJoins.files?.map((file: FileInfo) => ({
      url: file.file_url,
      type: file.file_type,
      name: file.file_url.split('/').pop() || 'file'
    })) || []
  }
} 
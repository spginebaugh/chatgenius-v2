import type { Channel, User } from "@/types/database"
import type { UiFileAttachment, ChatViewData } from "@/types/messages-ui"
import { handleMessage } from "@/app/actions/messages/index"

export function useMessageHandling() {
  const handleMainMessage = async (
    message: string, 
    currentView: ChatViewData,
    files?: UiFileAttachment[], 
    isRagQuery?: boolean,
    parentMessageId?: number,
    isImageGeneration?: boolean
  ) => {
    try {
      await handleMessage({
        message,
        files,
        isRagQuery,
        isImageGeneration,
        channelId: currentView.type === 'channel' ? (currentView.data as Channel).channel_id : undefined,
        receiverId: currentView.type === 'dm' ? (currentView.data as User).user_id : undefined,
        parentMessageId
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error // Re-throw the error so it can be handled by the caller
    }
  }

  return { handleMainMessage }
} 
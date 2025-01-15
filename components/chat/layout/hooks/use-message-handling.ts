import type { Channel, User } from "@/types/database"
import type { UiFileAttachment, ChatViewData } from "@/types/messages-ui"
import { handleMessage } from "@/app/actions/messages/index"

export function useMessageHandling() {
  const handleMainMessage = async (
    message: string, 
    currentView: ChatViewData,
    files?: UiFileAttachment[], 
    isRagQuery?: boolean,
    parentMessageId?: number
  ) => {
    try {
      await handleMessage({
        message,
        files,
        isRagQuery,
        channelId: currentView.type === 'channel' ? (currentView.data as Channel).id : undefined,
        receiverId: currentView.type === 'dm' ? (currentView.data as User).id : undefined,
        parentMessageId
      })
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  return { handleMainMessage }
} 
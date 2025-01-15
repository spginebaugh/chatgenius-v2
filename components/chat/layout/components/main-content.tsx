import type { Channel, User } from "@/types/database"
import type { UiMessage, UiFileAttachment, ChatViewData } from "@/types/messages-ui"
import { MessageList } from "../../message/message-list"
import { MessageInput } from "../../message/message-input"

interface MainContentProps {
  messages: UiMessage[]
  currentView: ChatViewData
  isLoading: boolean
  onReactionSelect: (messageId: number, emoji: string) => Promise<void>
  onThreadSelect: (messageId: number) => void
  onSendMessage: (message: string, files?: UiFileAttachment[], isRagQuery?: boolean) => Promise<void>
}

export function MainContent({ 
  messages, 
  currentView, 
  isLoading,
  onReactionSelect,
  onThreadSelect,
  onSendMessage
}: MainContentProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex-1 overflow-y-auto text-gray-900">
        <MessageList 
          messages={messages} 
          onReactionSelect={onReactionSelect}
          onThreadSelect={onThreadSelect}
        />
      </div>
      <div className="flex-shrink-0">
        <MessageInput 
          placeholder={
            currentView.type === 'channel' 
              ? `Message #${(currentView.data as Channel).slug}` 
              : `Message ${(currentView.data as User).username}`
          }
          onSendMessage={onSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
} 
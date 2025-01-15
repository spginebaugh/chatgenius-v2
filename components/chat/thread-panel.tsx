"use client"

// Imports
// -----------------------------------------------
import { useRealtimeMessages } from "@/lib/client/hooks/realtime-messages"
import { MessageInput } from "./message/message-input"
import { useThreadMessages } from "./thread/hooks"
import { 
  ThreadMessage, 
  ThreadHeader 
} from "./thread/components"
import type { ThreadPanelProps } from "./shared/types"

// Main Component
// -----------------------------------------------
export function ThreadPanel({ 
  selectedMessage, 
  currentUserId,
  onSendMessage,
  onClose, 
  onEmojiSelect
}: ThreadPanelProps) {
  const {
    threadMessages,
    handleNewMessage,
    handleDeleteMessage,
    handleUpdateMessage,
    handleUpdateReactions
  } = useThreadMessages(selectedMessage, currentUserId)

  useRealtimeMessages({
    parentMessageId: selectedMessage.id,
    onNewMessage: handleNewMessage,
    onMessageDelete: handleDeleteMessage,
    onMessageUpdate: handleUpdateMessage,
    onReactionUpdate: handleUpdateReactions
  })

  return (
    <div className="w-96 border-l border-gray-200 flex flex-col bg-white">
      <ThreadHeader onClose={onClose} />

      <div className="flex-1 overflow-y-auto">
        {/* Parent Message */}
        <div className="p-4 border-b border-gray-200">
          <ThreadMessage 
            message={selectedMessage}
            onEmojiSelect={onEmojiSelect}
          />
        </div>

        {/* Thread Messages */}
        <div className="p-4 space-y-4">
          {threadMessages.map((message) => (
            <ThreadMessage
              key={message.id}
              message={message}
              onEmojiSelect={onEmojiSelect}
            />
          ))}
        </div>
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200">
        <MessageInput
          onSendMessage={(message, files) => onSendMessage(message, files)}
          placeholder="Reply in thread..."
        />
      </div>
    </div>
  )
} 
"use client"

// Imports
// -----------------------------------------------
import { useThreadMessages } from "./thread/hooks"
import { MessageInput } from "./message/message-input"
import { MessageItem } from "./message/message-list/message-item"
import type { ThreadPanelProps } from "./shared/types"
import type { UiMessage } from "@/types/messages-ui"
import { X } from "lucide-react"

// Main Component
// -----------------------------------------------
export function ThreadPanel({ 
  selectedMessage, 
  currentUserId,
  onSendMessage: _onSendMessage,
  onClose, 
  onEmojiSelect
}: ThreadPanelProps) {
  const { threadMessages, sendMessage } = useThreadMessages(selectedMessage, currentUserId)

  console.log('Thread panel rendering with messages:', threadMessages)

  const handleSendMessage = async (message: string) => {
    await sendMessage(message)
  }

  const handleThreadSelect = () => {} // No-op since we're already in thread view

  return (
    <div className="w-96 border-l border-gray-200 bg-white flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Thread</h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-gray-200">
        <MessageItem
          message={selectedMessage}
          onReactionSelect={onEmojiSelect}
          onThreadSelect={handleThreadSelect}
          isThreadMessage
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-4">
          {threadMessages?.map((message: UiMessage) => {
            console.log('Rendering thread message:', message)
            return (
              <li key={message.message_id}>
                <MessageItem
                  message={message}
                  onReactionSelect={onEmojiSelect}
                  onThreadSelect={handleThreadSelect}
                  isThreadMessage
                />
              </li>
            )
          })}
        </ul>
      </div>

      <div className="p-4 border-t border-gray-200">
        <MessageInput 
          onSendMessage={handleSendMessage}
          placeholder="Reply in thread..."
        />
      </div>
    </div>
  )
} 
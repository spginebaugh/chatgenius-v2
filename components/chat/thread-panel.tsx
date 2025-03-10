"use client"

import { memo, useCallback } from "react"
import { useThreadMessages } from "./thread/hooks"
import { MessageInput } from "./message/message-input"
import { MessageItem } from "./message/message-list/message-item"
import type { ThreadPanelProps } from "./shared/types"
import type { UiMessage, UiFileAttachment } from "@/types/messages-ui"
import { X } from "lucide-react"

const ThreadMessage = memo(function ThreadMessage({ 
  message, 
  onEmojiSelect 
}: { 
  message: UiMessage
  onEmojiSelect: (messageId: number, emoji: string) => Promise<void>
}) {
  const handleThreadSelect = useCallback(() => {}, []) // No-op since we're already in thread view

  return (
    <MessageItem
      message={message}
      onReactionSelect={onEmojiSelect}
      onThreadSelect={handleThreadSelect}
      isThreadMessage
    />
  )
})

export const ThreadPanel = memo(function ThreadPanel({ 
  selectedMessage, 
  currentUserId,
  onSendMessage: _onSendMessage,
  onClose, 
  onEmojiSelect
}: ThreadPanelProps) {
  const { messages: threadMessages, sendMessage } = useThreadMessages(selectedMessage)

  const handleSendMessage = useCallback(async (message: string, files?: UiFileAttachment[], isRagQuery?: boolean, isImageGeneration?: boolean) => {
    await sendMessage(message, files, isRagQuery, isImageGeneration)
  }, [sendMessage])

  return (
    <div className="w-[450px] border-l border-gray-200 bg-white flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-[#333F48]">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Thread</h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-white hover:text-gray-300" />
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-gray-200">
        <ThreadMessage
          message={selectedMessage}
          onEmojiSelect={onEmojiSelect}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-4">
          {threadMessages?.map((message: UiMessage) => (
            <li key={message.message_id}>
              <ThreadMessage
                message={message}
                onEmojiSelect={onEmojiSelect}
              />
            </li>
          ))}
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
}) 
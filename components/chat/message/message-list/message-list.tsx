"use client"

import React from "react"
import { MessageItem } from "./message-item"
import type { UiMessage } from "@/types/messages-ui"

interface MessageListProps {
  messages: UiMessage[]
  onReactionSelect: (messageId: number, emoji: string) => Promise<void>
  onThreadSelect: (messageId: number) => void
  isThreadView?: boolean
}

export function MessageList({
  messages,
  onReactionSelect,
  onThreadSelect,
  isThreadView = false
}: MessageListProps) {
  return (
    <div className="h-full">
      <ul className="list-none">
        {messages.map((message) => (
          <li key={message.message_id}>
            <MessageItem
              message={message}
              onReactionSelect={onReactionSelect}
              onThreadSelect={onThreadSelect}
              isThreadMessage={isThreadView}
            />
          </li>
        ))}
      </ul>
    </div>
  )
} 
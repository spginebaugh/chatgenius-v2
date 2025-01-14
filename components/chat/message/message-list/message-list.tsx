"use client"

import React from "react"
import { MessageItem } from "./message-item"
import type { UiMessage } from "@/types/messages-ui"

interface MessageListProps {
  messages: UiMessage[]
  onReactionSelect: (messageId: number, emoji: string) => void
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
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          onReactionSelect={onReactionSelect}
          onThreadSelect={onThreadSelect}
          isThreadMessage={isThreadView}
        />
      ))}
    </div>
  )
} 
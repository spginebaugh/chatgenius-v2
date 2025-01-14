"use client"

import React, { useMemo } from "react"
import { MessageTime, UserAvatar } from "../../shared"
import { MessageFiles } from "./message-files"
import { MessageReactions } from "./message-reactions"
import type { UiMessage, UiMessageReaction } from "@/types/messages-ui"
import type { FileAttachment } from "../../shared"
import type { MessageFile } from "@/types/database"
import DOMPurify from "isomorphic-dompurify"
import { marked } from "marked"

interface MessageItemProps {
  message: UiMessage
  onReactionSelect: (messageId: number, emoji: string) => void
  onThreadSelect: (messageId: number) => void
  isThreadMessage?: boolean
}

export function MessageItem({
  message,
  onReactionSelect,
  onThreadSelect,
  isThreadMessage = false
}: MessageItemProps) {
  const formattedContent = useMemo(() => {
    const rawMarkdown = message.message || ''
    const html = marked.parse(rawMarkdown, { async: false }) as string
    return DOMPurify.sanitize(html)
  }, [message.message])

  const convertToFileAttachment = (file: MessageFile): FileAttachment => ({
    url: file.file_url,
    type: file.file_type,
    name: `File-${file.id}`
  })

  const timestamp = new Date(message.inserted_at).toISOString()

  return (
    <div className="group flex gap-3 px-4 py-2 hover:bg-gray-50">
      <UserAvatar
        username={message.profiles.username}
        status={message.profiles.status}
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{message.profiles.username}</span>
          <MessageTime timestamp={timestamp} />
        </div>

        <div 
          className="prose prose-sm max-w-none text-gray-900"
          dangerouslySetInnerHTML={{ __html: formattedContent }}
        />

        {message.files && message.files.length > 0 && (
          <MessageFiles files={message.files.map(convertToFileAttachment)} />
        )}

        <div className="flex items-center gap-4 mt-1">
          <MessageReactions
            reactions={message.reactions || []}
            onReactionSelect={() => onReactionSelect(message.id, "👍")}
          />

          {!isThreadMessage && (
            <button
              onClick={() => onThreadSelect(message.id)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Reply in Thread
            </button>
          )}
        </div>
      </div>
    </div>
  )
} 
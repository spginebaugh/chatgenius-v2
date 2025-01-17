"use client"

import React, { useMemo } from "react"
import { MessageTime, UserAvatar } from "../../shared"
import { MessageFiles } from "./message-files"
import { MessageReactions } from "./message-reactions"
import { RagMessage } from "./rag-message"
import type { UiMessage, UiMessageReaction } from "@/types/messages-ui"
import DOMPurify from "isomorphic-dompurify"
import { marked } from "marked"
import { MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { EmojiButton } from "../../thread/components/emoji-button"

const RAG_BOT_USER_ID = '00000000-0000-0000-0000-000000000000'

interface MessageItemProps {
  message: UiMessage
  onReactionSelect: (messageId: number, emoji: string) => Promise<void>
  onThreadSelect: (messageId: number) => void
  isThreadMessage?: boolean
  isStreaming?: boolean
}

export function MessageItem({
  message,
  onReactionSelect,
  onThreadSelect,
  isThreadMessage = false,
  isStreaming = false
}: MessageItemProps) {
  // If it's a RAG message (identified by user ID), use the specialized component
  if (message.user_id === RAG_BOT_USER_ID) {
    return (
      <RagMessage 
        message={message}
        isStreaming={isStreaming}
      />
    )
  }

  const formattedContent = useMemo(() => {
    const rawMarkdown = message.message || ''
    const html = marked.parse(rawMarkdown, { async: false }) as string
    return DOMPurify.sanitize(html)
  }, [message.message])

  const timestamp = new Date(message.inserted_at).toISOString()

  return (
    <div className="group relative flex gap-3 px-4 py-2 hover:bg-gray-50">
      <UserAvatar
        username={message.profiles.username}
        status={message.profiles.status}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{message.profiles.username}</span>
            <MessageTime timestamp={timestamp} />
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <EmojiButton
              messageId={message.message_id}
              onEmojiSelect={onReactionSelect}
            />
            {!isThreadMessage && (
              <button
                className="text-sm text-gray-500 hover:text-gray-700 bg-white h-8 px-2 rounded border border-gray-200 shadow-sm"
                onClick={() => onThreadSelect(message.message_id)}
              >
                <div className="flex items-center">
                  <MessageSquare className="h-4 w-4" />
                  {message.thread_count > 0 && (
                    <span className="ml-1 text-xs">{message.thread_count}</span>
                  )}
                </div>
              </button>
            )}
          </div>
        </div>

        <div 
          className="prose prose-sm max-w-none text-gray-900"
          dangerouslySetInnerHTML={{ __html: formattedContent }}
        />

        {message.files && message.files.length > 0 && (
          <MessageFiles files={message.files} />
        )}

        <div className="flex items-center space-x-2 mt-2">
          {message.reactions.map((reaction) => (
            <button
              key={reaction.emoji}
              className={cn(
                'px-2 py-1 rounded hover:bg-gray-100',
                reaction.reacted_by_me && 'bg-gray-100'
              )}
              onClick={() => onReactionSelect(message.message_id, reaction.emoji)}
            >
              {reaction.emoji} {reaction.count}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
} 
"use client"

import React from "react"
import { MessageTime } from "../../shared"
import { MessageFiles } from "./message-files"
import { RagBotAvatar } from "../../shared/rag-bot-avatar"
import type { UiMessage } from "@/types/messages-ui"
import { Skeleton } from "@/components/ui/skeleton"
import { EmojiButton } from "../../thread/components/emoji-button"
import { MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface RagMessageProps {
  message: UiMessage
  onReactionSelect: (messageId: number, emoji: string) => Promise<void>
  onThreadSelect: (messageId: number) => void
  isThreadMessage?: boolean
  isStreaming?: boolean
}

export function RagMessage({
  message,
  onReactionSelect,
  onThreadSelect,
  isThreadMessage = false,
  isStreaming = false
}: RagMessageProps) {
  const timestamp = new Date(message.inserted_at).toISOString()

  return (
    <div className="group relative flex gap-3 px-4 py-3 bg-gray-50/50">
      <RagBotAvatar />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-600">RAG Bot</span>
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

        {isStreaming ? (
          <div className="space-y-2 mt-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <>
            <div className="prose prose-sm max-w-none text-gray-900 prose-p:leading-relaxed prose-pre:bg-gray-100 prose-pre:p-2 prose-pre:rounded">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.message || ''}
              </ReactMarkdown>
            </div>

            {message.files && message.files.length > 0 && (
              <MessageFiles files={message.files} />
            )}

            <div className="flex items-center space-x-2 mt-2">
              {message.reactions?.map((reaction) => (
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
          </>
        )}
      </div>
    </div>
  )
} 
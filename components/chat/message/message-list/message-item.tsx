"use client"

import React, { useMemo } from "react"
import { MessageTime, UserAvatar } from "../../shared"
import { MessageFiles } from "./message-files"
import { MessageReactions } from "./message-reactions"
import type { UiMessage, UiMessageReaction } from "@/types/messages-ui"
import DOMPurify from "isomorphic-dompurify"
import { marked } from "marked"
import { SmileIcon, MessageSquareIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EMOJI_LIST } from "../../shared"
import { Button } from "@/components/ui/button"

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

  const timestamp = new Date(message.inserted_at).toISOString()

  return (
    <div className="group relative flex gap-3 px-4 py-2 hover:bg-gray-50">
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
          <MessageFiles files={message.files} />
        )}

        <div className="flex items-center gap-4 mt-1">
          <div className="flex items-center gap-2">
            {message.reactions && message.reactions.length > 0 && message.reactions.map((reaction, index) => (
              <button
                key={index}
                onClick={() => onReactionSelect(message.id, reaction.emoji)}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                  reaction.reacted_by_me
                    ? 'bg-gray-200 text-gray-900'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute right-8 top-2 flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="text-gray-500 hover:text-gray-700 p-2 rounded hover:bg-gray-100 flex items-center gap-2"
            >
              <SmileIcon className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-2" align="end">
            <div className="grid grid-cols-4 gap-2">
              {EMOJI_LIST.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => onReactionSelect(message.id, emoji)}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {!isThreadMessage && (
          <button
            onClick={() => onThreadSelect(message.id)}
            className="text-gray-500 hover:text-gray-700 p-2 rounded hover:bg-gray-100 flex items-center gap-2"
          >
            <MessageSquareIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
} 
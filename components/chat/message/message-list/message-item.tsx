"use client"

import React, { useMemo } from "react"
import { MessageTime, UserAvatar } from "../../shared"
import { MessageFiles } from "./message-files"
import { MessageReactions } from "./message-reactions"
import { RagMessage } from "./rag-message"
import type { UiMessage } from "@/types/messages-ui"
import DOMPurify from "isomorphic-dompurify"
import { marked } from "marked"
import { MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { EmojiButton } from "../../thread/components/emoji-button"

const RAG_BOT_USER_ID = '00000000-0000-0000-0000-000000000000'

// Helper to detect if content is HTML
function isHTML(str: string): boolean {
  const htmlRegex = /<[a-z][\s\S]*>/i
  return htmlRegex.test(str)
}

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
        onReactionSelect={onReactionSelect}
        onThreadSelect={onThreadSelect}
        isThreadMessage={isThreadMessage}
        isStreaming={isStreaming}
      />
    )
  }

  const sanitizedContent = useMemo(() => {
    if (!message.message) return ''

    // Configure DOMPurify to allow specific HTML tags and attributes
    const config = {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'del', 'a', 
        'ul', 'ol', 'li', 'code', 'pre', 'blockquote',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
      ALLOW_DATA_ATTR: false,
      ADD_TAGS: [], // Additional allowed tags
      ADD_ATTR: ['target', 'rel'], // Additional allowed attributes
    }

    let html: string
    
    // If the content is already HTML (from Tiptap), use it directly
    // Otherwise, convert markdown to HTML
    if (isHTML(message.message)) {
      html = message.message
    } else {
      // Configure marked for GitHub Flavored Markdown
      marked.setOptions({
        gfm: true,
        breaks: true,
      })
      html = marked.parse(message.message, { async: false }) as string
    }

    // First sanitize the HTML content
    const sanitized = DOMPurify.sanitize(html, config)

    // Then process links to add target and rel attributes
    const div = document.createElement('div')
    div.innerHTML = sanitized
    div.querySelectorAll('a').forEach(link => {
      link.setAttribute('target', '_blank')
      link.setAttribute('rel', 'noopener noreferrer')
    })

    return div.innerHTML
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
          className="prose prose-sm max-w-none text-gray-900 [&_a]:text-blue-600 [&_a]:no-underline hover:[&_a]:underline [&_ul]:list-disc [&_ol]:list-decimal [&_pre]:bg-gray-100 [&_pre]:p-2 [&_pre]:rounded [&_code]:text-sm [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_del]:line-through [&_s]:line-through"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
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
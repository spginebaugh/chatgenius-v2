"use client"

import React from "react"
import { MessageTime } from "../../shared"
import { MessageFiles } from "./message-files"
import { RagBotAvatar } from "../../shared/rag-bot-avatar"
import type { UiMessage } from "@/types/messages-ui"
import DOMPurify from "isomorphic-dompurify"
import { marked } from "marked"
import { Skeleton } from "@/components/ui/skeleton"

interface RagMessageProps {
  message: UiMessage
  isStreaming?: boolean
}

export function RagMessage({
  message,
  isStreaming = false
}: RagMessageProps) {
  const formattedContent = React.useMemo(() => {
    const rawMarkdown = message.message || ''
    const html = marked.parse(rawMarkdown, { async: false }) as string
    return DOMPurify.sanitize(html)
  }, [message.message])

  const timestamp = new Date(message.inserted_at).toISOString()

  return (
    <div className="group relative flex gap-3 px-4 py-3 bg-gray-50/50">
      <RagBotAvatar />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-blue-600">RAG Bot</span>
          <MessageTime timestamp={timestamp} />
        </div>

        {isStreaming ? (
          <div className="space-y-2 mt-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <>
            <div 
              className="prose prose-sm max-w-none text-gray-900 prose-p:leading-relaxed prose-pre:bg-gray-100 prose-pre:p-2 prose-pre:rounded"
              dangerouslySetInnerHTML={{ __html: formattedContent }}
            />

            {message.files && message.files.length > 0 && (
              <MessageFiles files={message.files} />
            )}
          </>
        )}
      </div>
    </div>
  )
} 
"use client"

import React from "react"
import type { UiMessageReaction } from "@/types/messages-ui"
import { SmileIcon } from "lucide-react"

interface MessageReactionsProps {
  reactions: UiMessageReaction[]
  onReactionSelect: () => void
}

export function MessageReactions({ reactions, onReactionSelect }: MessageReactionsProps) {
  return (
    <div className="flex items-center gap-2 relative">
      {reactions && reactions.length > 0 && (
        <div className="flex items-center gap-2">
          {reactions.map((reaction, index) => (
            <button
              key={index}
              onClick={onReactionSelect}
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
      )}
      <button
        onClick={onReactionSelect}
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100 absolute right-0"
      >
        <SmileIcon className="h-4 w-4" />
      </button>
    </div>
  )
} 
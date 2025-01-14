"use client"

import React from "react"
import type { UiMessageReaction } from "@/types/messages-ui"

interface MessageReactionsProps {
  reactions: UiMessageReaction[]
  onReactionSelect: () => void
}

export function MessageReactions({ reactions, onReactionSelect }: MessageReactionsProps) {
  if (!reactions || reactions.length === 0) {
    return (
      <button
        onClick={onReactionSelect}
        className="text-xs text-gray-500 hover:text-gray-700"
      >
        React
      </button>
    )
  }

  return (
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
  )
} 
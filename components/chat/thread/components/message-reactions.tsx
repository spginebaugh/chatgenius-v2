import type { UiMessage } from "@/types/messages-ui"

interface MessageReactionsProps {
  message: UiMessage
  onEmojiSelect?: (messageId: number, emoji: string) => Promise<void>
}

export function MessageReactions({ message, onEmojiSelect }: MessageReactionsProps) {
  if (!message.reactions?.length) return null

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {message.reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => onEmojiSelect?.(message.message_id, reaction.emoji)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
            reaction.reacted_by_me 
              ? 'bg-gray-100 border-gray-300' 
              : 'bg-transparent border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span>{reaction.emoji}</span>
        </button>
      ))}
    </div>
  )
} 
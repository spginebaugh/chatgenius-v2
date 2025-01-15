import ReactMarkdown from 'react-markdown'
import type { UserStatus } from "@/types/database"
import type { UiMessage } from "@/types/messages-ui"
import { UserAvatar, MessageTime } from "../../shared"
import { MessageFiles } from "./message-files"
import { MessageReactions } from "./message-reactions"
import { EmojiButton } from "./emoji-button"

interface ThreadMessageProps {
  message: UiMessage
  onEmojiSelect: (messageId: number, emoji: string) => Promise<void>
}

export function ThreadMessage({ message, onEmojiSelect }: ThreadMessageProps) {
  return (
    <div className="flex items-start gap-3 group">
      <UserAvatar 
        username={message.profiles?.username}
        status={message.profiles?.status as UserStatus}
      />
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-bold text-gray-900 text-base">
            {message.profiles?.username || 'Unknown User'}
          </span>
          <MessageTime timestamp={message.inserted_at} />
          <EmojiButton messageId={message.id} onEmojiSelect={onEmojiSelect} />
        </div>
        <div className="text-gray-700 text-sm prose prose-sm max-w-none">
          <ReactMarkdown>{message.message}</ReactMarkdown>
        </div>
        <MessageFiles files={message.files} />
        <MessageReactions message={message} onEmojiSelect={onEmojiSelect} />
      </div>
    </div>
  )
} 
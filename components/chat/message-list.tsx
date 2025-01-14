"use client"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { SmileIcon } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import type { DbMessage, MessageFile, MessageReaction } from "@/types/database"
import type { UiMessage } from "@/types/messages-ui"

interface DisplayMessage extends UiMessage {
  files?: MessageFile[]
}

interface MessageListProps {
  messages: DisplayMessage[]
  onThreadClick?: (message: DisplayMessage) => void
  onEmojiSelect?: (messageId: number, emoji: string) => void
}

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🤔", "👀"]

const MessageFiles = ({ files }: { files?: MessageFile[] }) => (
  <>
    {files && files.length > 0 && (
      <div className="mt-2 flex flex-wrap gap-2">
        {files.map((file, index) => (
          file.file_type === 'image' && (
            <a 
              key={index} 
              href={file.file_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <img 
                src={file.file_url} 
                alt="Attached image"
                className="max-h-60 rounded-lg object-cover shadow-sm hover:shadow-md transition-shadow"
              />
            </a>
          )
        ))}
      </div>
    )}
  </>
)

export function MessageList({ messages, onThreadClick, onEmojiSelect }: MessageListProps) {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div key={message.id} className="flex items-start gap-3 group">
          <div className="w-9 h-9 rounded bg-[#BF5700] text-white flex items-center justify-center uppercase font-medium">
            {message.profiles?.username?.charAt(0) || '?'}
          </div>
          <div className="flex-1">
            <div className="flex items-baseline justify-between mb-1">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-gray-900 text-base">
                  {message.profiles?.username || 'Unknown User'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(message.inserted_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button 
                  variant="ghost"
                  size="sm"
                  className="text-sm text-gray-500 hover:text-gray-700 bg-white h-8 px-2 rounded border border-gray-200 shadow-sm"
                  onClick={() => onThreadClick?.(message)}
                >
                  {message.thread_count > 0 ? `${message.thread_count} ${message.thread_count === 1 ? 'reply' : 'replies'}` : 'Reply'}
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="text-sm text-gray-500 hover:text-gray-700 bg-white h-8 px-2 rounded border border-gray-200 shadow-sm"
                    >
                      <SmileIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-2">
                    <div className="grid grid-cols-4 gap-2">
                      {EMOJI_LIST.map((emoji) => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => onEmojiSelect?.(message.id, emoji)}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="text-gray-700 text-sm prose prose-sm max-w-none">
              <ReactMarkdown>{message.message}</ReactMarkdown>
            </div>
            <MessageFiles files={message.files} />
            {/* Emoji Reactions */}
            {message.reactions && message.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {message.reactions.map((reaction) => (
                  <button
                    key={reaction.emoji}
                    onClick={() => onEmojiSelect?.(message.id, reaction.emoji)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                      reaction.reacted_by_me 
                        ? 'bg-gray-100 border-gray-300' 
                        : 'bg-transparent border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span>{reaction.emoji}</span>
                    <span>{reaction.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
} 
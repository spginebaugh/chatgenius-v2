"use client"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { SmileIcon } from "lucide-react"

interface MessageListProps {
  messages: Array<{
    id: string
    message: string
    inserted_at: string
    profiles: {
      id: string
      username: string
    }
    thread_messages?: Array<{
      id: string
      message: string
      inserted_at: string
      profiles: {
        id: string
        username: string
      }
    }>
    reactions?: Array<{
      emoji: string
      count: number
      reacted_by_me: boolean
    }>
  }>
  onThreadClick?: (message: MessageListProps["messages"][0]) => void
  onEmojiSelect?: (messageId: string, emoji: string, parent_type: 'channel_message' | 'direct_message' | 'thread_message') => void
  viewType: 'channel' | 'dm'
}

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🤔", "👀"]

export function MessageList({ messages, onThreadClick, onEmojiSelect, viewType }: MessageListProps) {
  const handleEmojiSelect = (messageId: string, emoji: string) => {
    onEmojiSelect?.(
      messageId, 
      emoji, 
      viewType === 'channel' ? 'channel_message' : 'direct_message'
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {messages?.map((message) => (
        <div key={message.id} className="flex items-start gap-3 hover:bg-gray-50 px-2 py-1 rounded group">
          <div className="w-9 h-9 rounded bg-[#BF5700] text-white flex items-center justify-center uppercase font-medium">
            {message.profiles?.username?.charAt(0) || '?'}
          </div>
          <div className="flex-1 relative">
            <div className="flex items-baseline gap-2 mb-1">
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
            <p className="text-gray-700 text-sm">{message.message}</p>
            
            {/* Emoji Reactions */}
            {message.reactions && message.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {message.reactions.map((reaction) => (
                  <button
                    key={reaction.emoji}
                    onClick={() => handleEmojiSelect(message.id, reaction.emoji)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                      reaction.reacted_by_me 
                        ? 'bg-gray-100 border-gray-300' 
                        : 'bg-transparent border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span>{reaction.emoji}</span>
                    <span className="text-gray-500">{reaction.count}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    className="text-sm text-gray-500 hover:text-gray-700 bg-white h-8 px-2 rounded border border-gray-200 shadow-sm"
                    variant="ghost"
                    size="sm"
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
                        onClick={() => handleEmojiSelect(message.id, emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <button 
                onClick={() => onThreadClick?.(message)}
                className="text-sm text-gray-500 hover:text-gray-700 bg-white px-3 py-1 rounded border border-gray-200 shadow-sm"
              >
                Reply to thread
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 
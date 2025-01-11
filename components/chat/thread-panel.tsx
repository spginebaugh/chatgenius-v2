"use client"

import { ChannelMessage } from "@/types/database"
import { ReactionType } from "@/types/frontend"
import { MessageInput } from "./message-input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { SmileIcon } from "lucide-react"

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🤔", "👀"]

interface ThreadPanelProps {
  parentMessage: {
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
      reactions?: ReactionType[]
    }>
    reactions?: ReactionType[]
  }
  onSendMessage: (message: string) => Promise<void>
  onClose: () => void
  onEmojiSelect: (messageId: string, emoji: string, parent_type: 'channel_message' | 'direct_message' | 'thread_message') => void
}

export function ThreadPanel({ 
  parentMessage, 
  onSendMessage,
  onClose, 
  onEmojiSelect 
}: ThreadPanelProps) {
  const MessageReactions = ({ message, isThreadMessage = false }: { message: typeof parentMessage, isThreadMessage?: boolean }) => (
    <>
      {/* Emoji Reactions */}
      {message.reactions && message.reactions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {message.reactions.map((reaction) => (
            <button
              key={reaction.emoji}
              onClick={() => onEmojiSelect?.(
                message.id, 
                reaction.emoji, 
                isThreadMessage ? 'thread_message' : 'channel_message'
              )}
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
    </>
  )

  const EmojiButton = ({ messageId, isThreadMessage = false }: { messageId: string, isThreadMessage?: boolean }) => (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 px-2"
          >
            <SmileIcon className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-2">
          <div className="grid grid-cols-4 gap-2">
            {EMOJI_LIST.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                className="h-8 px-2"
                onClick={() => onEmojiSelect?.(
                  messageId, 
                  emoji, 
                  isThreadMessage ? 'thread_message' : 'channel_message'
                )}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )

  return (
    <div className="w-96 border-l border-gray-200 flex flex-col bg-white">
      {/* Header */}
      <div className="h-14 bg-[#333F48] flex items-center justify-between px-4">
        <div className="text-white font-semibold">Thread</div>
        <button 
          onClick={onClose}
          className="text-white hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Parent Message */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-start gap-3 group">
            <div className="w-9 h-9 rounded bg-[#BF5700] text-white flex items-center justify-center uppercase font-medium">
              {parentMessage.profiles?.username?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-bold text-gray-900 text-base">
                  {parentMessage.profiles?.username || 'Unknown User'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(parentMessage.inserted_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </span>
                <EmojiButton messageId={parentMessage.id} isThreadMessage={false} />
              </div>
              <p className="text-gray-700 text-sm">{parentMessage.message}</p>
              <MessageReactions message={parentMessage} isThreadMessage={false} />
            </div>
          </div>
        </div>

        {/* Responses */}
        <div className="p-4 space-y-4">
          {parentMessage.thread_messages?.map((threadMessage) => (
            <div key={threadMessage.id} className="flex items-start gap-3 group">
              <div className="w-9 h-9 rounded bg-[#BF5700] text-white flex items-center justify-center uppercase font-medium">
                {threadMessage.profiles?.username?.charAt(0) || '?'}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-bold text-gray-900 text-base">
                    {threadMessage.profiles?.username || 'Unknown User'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(threadMessage.inserted_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </span>
                  <EmojiButton messageId={threadMessage.id} isThreadMessage={true} />
                </div>
                <p className="text-gray-700 text-sm">{threadMessage.message}</p>
                <MessageReactions message={threadMessage} isThreadMessage={true} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Input */}
      <MessageInput
        placeholder="Reply to thread..."
        onSendMessage={onSendMessage}
      />
    </div>
  )
} 
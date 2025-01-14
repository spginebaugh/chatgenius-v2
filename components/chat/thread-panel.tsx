"use client"

import { DbMessage, MessageFile, MessageReaction } from "@/types/database"
import { UiMessage } from "@/types/messages-ui"
import { MessageInput } from "./message-input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { SmileIcon } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import { useRealtimeMessages } from "@/lib/client/hooks/use-realtime-messages"
import { useState } from "react"
import { useUsersStore } from "@/lib/stores/users"

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🤔", "👀"]

interface ThreadMessage extends UiMessage {
  files?: MessageFile[]
}

interface ThreadPanelProps {
  parentMessage: ThreadMessage
  currentUserId: string
  onSendMessage: (message: string) => Promise<void>
  onClose: () => void
  onEmojiSelect: (messageId: number, emoji: string) => void
}

export function ThreadPanel({ 
  parentMessage, 
  currentUserId,
  onSendMessage,
  onClose, 
  onEmojiSelect
}: ThreadPanelProps) {
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>(parentMessage.thread_messages || [])
  const { users: storeUsers } = useUsersStore()

  // Setup realtime message updates for thread
  useRealtimeMessages({
    parentMessageId: parentMessage.id,
    onNewMessage: (message: DbMessage) => {
      // Double-check that this message belongs to this thread
      if (message.parent_message_id !== parentMessage.id || message.message_type !== 'thread') {
        return
      }

      // Message should already have profiles data from the hook
      const threadMessage = message as unknown as ThreadMessage

      // Check if message already exists to avoid duplicates
      setThreadMessages(prev => {
        const exists = prev.some(m => m.id === message.id)
        if (exists) {
          return prev.map(m => m.id === message.id ? threadMessage : m)
        }
        // Sort messages by timestamp when adding new ones
        return [...prev, threadMessage].sort((a, b) => 
          new Date(a.inserted_at).getTime() - new Date(b.inserted_at).getTime()
        )
      })
    },
    onMessageDelete: (message: DbMessage) => {
      // Double-check that this message belongs to this thread
      if (message.parent_message_id !== parentMessage.id || message.message_type !== 'thread') {
        return
      }
      setThreadMessages(prev => prev.filter(msg => msg.id !== message.id))
    },
    onMessageUpdate: (message: DbMessage) => {
      // Double-check that this message belongs to this thread
      if (message.parent_message_id !== parentMessage.id || message.message_type !== 'thread') {
        return
      }

      // Message should already have profiles data from the hook
      const threadMessage = message as unknown as ThreadMessage

      setThreadMessages(prev => prev.map(msg => {
        if (msg.id !== message.id) return msg
        return {
          ...msg,
          ...threadMessage,
          // Preserve any fields that might not be in the update
          files: msg.files || threadMessage.files,
          reactions: msg.reactions || threadMessage.reactions
        }
      }))
    },
    onReactionUpdate: (messageId: number, reactions: MessageReaction[]) => {
      // Group reactions by emoji and count unique users
      const reactionsByEmoji = reactions.reduce((acc: Record<string, { emoji: string; userIds: Set<string> }>, reaction) => {
        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = {
            emoji: reaction.emoji,
            userIds: new Set()
          }
        }
        acc[reaction.emoji].userIds.add(reaction.user_id)
        return acc
      }, {})

      // Transform to UI format with correct counts and reacted_by_me status
      const displayReactions = Object.values(reactionsByEmoji).map(({ emoji, userIds }) => ({
        emoji,
        count: userIds.size,
        reacted_by_me: userIds.has(currentUserId)
      }))

      setThreadMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? {
              ...msg,
              reactions: displayReactions
            }
          : msg
      ))
    }
  })

  const MessageReactions = ({ message }: { message: ThreadMessage }) => (
    <>
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
            </button>
          ))}
        </div>
      )}
    </>
  )

  const EmojiButton = ({ messageId }: { messageId: number }) => (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
                onClick={() => onEmojiSelect?.(messageId, emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )

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
                <EmojiButton messageId={parentMessage.id} />
              </div>
              <div className="text-gray-700 text-sm prose prose-sm max-w-none">
                <ReactMarkdown>{parentMessage.message}</ReactMarkdown>
              </div>
              <MessageFiles files={parentMessage.files} />
              <MessageReactions message={parentMessage} />
            </div>
          </div>
        </div>

        {/* Responses */}
        <div className="p-4 space-y-4">
          {threadMessages.map((threadMessage) => (
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
                  <EmojiButton messageId={threadMessage.id} />
                </div>
                <div className="text-gray-700 text-sm prose prose-sm max-w-none">
                  <ReactMarkdown>{threadMessage.message}</ReactMarkdown>
                </div>
                <MessageFiles files={threadMessage.files} />
                <MessageReactions message={threadMessage} />
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
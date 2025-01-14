"use client"

import { MessageInput } from "./message/message-input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { SmileIcon } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import { useRealtimeMessages } from "@/lib/client/hooks/realtime-messages"
import { useState } from "react"
import { EMOJI_LIST, UserAvatar, MessageTime, THEME_COLORS } from "./shared"
import type { ThreadMessage } from "./shared"
import type { MessageReaction, DbMessage } from "@/types/database"

interface ThreadPanelProps {
  parentMessage: ThreadMessage
  currentUserId: string
  onSendMessage: (message: string) => Promise<void>
  onClose: () => void
  onEmojiSelect: (messageId: number, emoji: string) => void
}

function useThreadMessages(parentMessage: ThreadMessage) {
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>(
    parentMessage.thread_messages || []
  )

  const addOrUpdateMessage = (message: ThreadMessage) => {
    if (
      message.parent_message_id !== parentMessage.id ||
      message.message_type !== 'thread'
    ) {
      return
    }

    setThreadMessages(prev => {
      const exists = prev.some(m => m.id === message.id)
      if (exists) {
        return prev.map(m => m.id === message.id ? message : m)
      }
      return [...prev, message].sort((a, b) => 
        new Date(a.inserted_at).getTime() - new Date(b.inserted_at).getTime()
      )
    })
  }

  const deleteMessage = (message: ThreadMessage) => {
    if (
      message.parent_message_id !== parentMessage.id ||
      message.message_type !== 'thread'
    ) {
      return
    }
    setThreadMessages(prev => prev.filter(msg => msg.id !== message.id))
  }

  const updateMessage = (message: ThreadMessage) => {
    if (
      message.parent_message_id !== parentMessage.id ||
      message.message_type !== 'thread'
    ) {
      return
    }

    setThreadMessages(prev => prev.map(msg => {
      if (msg.id !== message.id) return msg
      return {
        ...msg,
        ...message,
        files: msg.files || message.files,
        reactions: msg.reactions || message.reactions
      }
    }))
  }

  const updateReactions = (messageId: number, reactions: MessageReaction[], currentUserId: string) => {
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

    const displayReactions = Object.values(reactionsByEmoji).map(({ emoji, userIds }) => ({
      emoji,
      count: userIds.size,
      reacted_by_me: userIds.has(currentUserId)
    }))

    setThreadMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, reactions: displayReactions }
        : msg
    ))
  }

  return {
    threadMessages,
    addOrUpdateMessage,
    deleteMessage,
    updateMessage,
    updateReactions
  }
}

function MessageFiles({ files }: { files?: ThreadMessage['files'] }) {
  if (!files?.length) return null

  return (
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
  )
}

function MessageReactions({ message, onEmojiSelect }: { 
  message: ThreadMessage
  onEmojiSelect?: (messageId: number, emoji: string) => void 
}) {
  if (!message.reactions?.length) return null

  return (
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
  )
}

function EmojiButton({ messageId, onEmojiSelect }: { 
  messageId: number
  onEmojiSelect: (messageId: number, emoji: string) => void 
}) {
  return (
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
                onClick={() => onEmojiSelect(messageId, emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function ThreadMessage({ message, onEmojiSelect }: {
  message: ThreadMessage
  onEmojiSelect: (messageId: number, emoji: string) => void
}) {
  return (
    <div className="flex items-start gap-3 group">
      <UserAvatar 
        username={message.profiles?.username}
        status={message.profiles?.status as any}
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

function ThreadHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className={`h-14 bg-[${THEME_COLORS.headerBg}] flex items-center justify-between px-4`}>
      <div className="text-white font-semibold">Thread</div>
      <button 
        onClick={onClose}
        className="text-white hover:text-gray-300"
      >
        ✕
      </button>
    </div>
  )
}

export function ThreadPanel({ 
  parentMessage, 
  currentUserId,
  onSendMessage,
  onClose, 
  onEmojiSelect
}: ThreadPanelProps) {
  const {
    threadMessages,
    addOrUpdateMessage,
    deleteMessage,
    updateMessage,
    updateReactions
  } = useThreadMessages(parentMessage)

  useRealtimeMessages({
    parentMessageId: parentMessage.id,
    onNewMessage: (message: DbMessage) => addOrUpdateMessage(message as unknown as ThreadMessage),
    onMessageDelete: (message: DbMessage) => deleteMessage(message as unknown as ThreadMessage),
    onMessageUpdate: (message: DbMessage) => updateMessage(message as unknown as ThreadMessage),
    onReactionUpdate: (messageId, reactions) => 
      updateReactions(messageId, reactions, currentUserId)
  })

  return (
    <div className="w-96 border-l border-gray-200 flex flex-col bg-white">
      <ThreadHeader onClose={onClose} />

      <div className="flex-1 overflow-y-auto">
        {/* Parent Message */}
        <div className="p-4 border-b border-gray-200">
          <ThreadMessage 
            message={parentMessage}
            onEmojiSelect={onEmojiSelect}
          />
        </div>

        {/* Responses */}
        <div className="p-4 space-y-4">
          {threadMessages.map((message) => (
            <ThreadMessage
              key={message.id}
              message={message}
              onEmojiSelect={onEmojiSelect}
            />
          ))}
        </div>
      </div>

      <MessageInput
        placeholder="Reply to thread..."
        onSendMessage={onSendMessage}
      />
    </div>
  )
} 
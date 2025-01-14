"use client"

import { useState, useCallback, useEffect } from "react"
import { MessageInput } from "./message/message-input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { SmileIcon } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import { useRealtimeMessages } from "@/lib/client/hooks/realtime-messages"
import { EMOJI_LIST, UserAvatar, MessageTime, THEME_COLORS } from "./shared"
import type { MessageReaction, UserStatus, DbMessage, MessageFile } from "@/types/database"
import type { UiMessage, UiMessageReaction, UiFileAttachment } from "@/types/messages-ui"
import { createClient } from "@/lib/supabase/client"
import { formatReactions } from "@/lib/stores/messages/utils"

interface ThreadPanelProps {
  parentMessage: UiMessage
  currentUserId: string
  onSendMessage: (message: string) => Promise<void>
  onClose: () => void
  onEmojiSelect: (messageId: number, emoji: string) => void
}

function useThreadMessages(parentMessage: UiMessage, currentUserId: string) {
  const [threadMessages, setThreadMessages] = useState<UiMessage[]>(
    parentMessage.thread_messages || []
  )
  const supabase = createClient()

  // Helper to fetch and format a complete message
  const fetchAndFormatMessage = async (messageId: number): Promise<UiMessage | null> => {
    const { data: messageWithJoins } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:users!messages_user_id_fkey(
          id,
          username,
          profile_picture_url,
          status
        ),
        files:message_files(*),
        reactions:message_reactions(*)
      `)
      .eq('id', messageId)
      .single()

    if (!messageWithJoins) return null

    return {
      ...messageWithJoins,
      message: messageWithJoins.message || '',
      profiles: {
        id: messageWithJoins.profiles?.id || messageWithJoins.user_id,
        username: messageWithJoins.profiles?.username || 'Unknown',
        profile_picture_url: messageWithJoins.profiles?.profile_picture_url || null,
        status: messageWithJoins.profiles?.status || 'OFFLINE'
      },
      reactions: formatReactions(messageWithJoins.reactions || [], currentUserId),
      files: ((messageWithJoins.files || []) as MessageFile[]).map(file => ({
        url: file.file_url,
        type: file.file_type,
        name: file.file_url.split('/').pop() || 'file'
      })),
      thread_messages: []
    }
  }

  const addOrUpdateMessage = useCallback(async (message: DbMessage) => {
    if (
      message.parent_message_id !== parentMessage.id ||
      message.message_type !== 'thread'
    ) {
      return
    }

    const formattedMessage = await fetchAndFormatMessage(message.id)
    if (!formattedMessage) return

    setThreadMessages(prev => {
      const exists = prev.some(m => m.id === message.id)
      if (exists) {
        return prev.map(m => m.id === message.id ? formattedMessage : m)
      }
      return [...prev, formattedMessage].sort((a, b) => 
        new Date(a.inserted_at).getTime() - new Date(b.inserted_at).getTime()
      )
    })
  }, [parentMessage.id, currentUserId])

  const deleteMessage = useCallback((message: DbMessage) => {
    if (
      message.parent_message_id !== parentMessage.id ||
      message.message_type !== 'thread'
    ) {
      return
    }
    setThreadMessages(prev => prev.filter(msg => msg.id !== message.id))
  }, [parentMessage.id])

  const updateMessage = useCallback(async (message: DbMessage) => {
    if (
      message.parent_message_id !== parentMessage.id ||
      message.message_type !== 'thread'
    ) {
      return
    }

    const formattedMessage = await fetchAndFormatMessage(message.id)
    if (!formattedMessage) return

    setThreadMessages(prev => prev.map(msg => 
      msg.id === message.id ? formattedMessage : msg
    ))
  }, [parentMessage.id, currentUserId])

  const updateReactions = useCallback((messageId: number, reactions: MessageReaction[]) => {
    setThreadMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, reactions: formatReactions(reactions, currentUserId) }
        : msg
    ))
  }, [currentUserId])

  // Initialize thread messages with formatted data
  useEffect(() => {
    const initializeThreadMessages = async () => {
      if (!parentMessage.thread_messages?.length) return

      const formattedMessages = await Promise.all(
        parentMessage.thread_messages.map(msg => fetchAndFormatMessage(msg.id))
      )

      setThreadMessages(formattedMessages.filter((msg): msg is UiMessage => msg !== null))
    }

    initializeThreadMessages()
  }, [parentMessage.thread_messages])

  return {
    threadMessages,
    addOrUpdateMessage,
    deleteMessage,
    updateMessage,
    updateReactions
  }
}

function MessageFiles({ files }: { files?: UiFileAttachment[] }) {
  if (!files?.length) return null

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {files.map((file, index) => (
        file.type === 'image' && (
          <a 
            key={index} 
            href={file.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block"
          >
            <img 
              src={file.url} 
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
  message: UiMessage
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
  message: UiMessage
  onEmojiSelect: (messageId: number, emoji: string) => void
}) {
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

function ThreadHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="h-14 bg-[#333F48] flex items-center justify-between px-4">
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
  } = useThreadMessages(parentMessage, currentUserId)

  useRealtimeMessages({
    parentMessageId: parentMessage.id,
    onNewMessage: (message: DbMessage) => addOrUpdateMessage(message),
    onMessageDelete: (message: DbMessage) => deleteMessage(message),
    onMessageUpdate: (message: DbMessage) => updateMessage(message),
    onReactionUpdate: (messageId, reactions) => updateReactions(messageId, reactions)
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
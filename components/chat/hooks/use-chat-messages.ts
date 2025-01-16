import { useCallback } from "react"
import type { DbMessage, User, MessageReaction } from "@/types/database"
import type { UiMessage, UiFileAttachment } from "@/types/messages-ui"
import { useMessagesStore } from "@/lib/stores/messages/index"
import { useRealtimeMessages } from "@/lib/client/hooks/realtime-messages"
import { handleMessage, addEmojiReaction } from "@/app/actions/messages"
import { formatReactions } from "@/lib/stores/messages/utils"
import { createUiProfile } from "./use-chat-users"
import { formatMessageForClient } from '@/app/_lib/messages/client/format-messages'
import type { MessageWithJoins } from '@/app/_lib/messages/queries/types'

// Types
interface UseChatMessagesProps {
  messageType: 'channels' | 'dms'
  key: string
  users: User[]
  currentUser: User
  channelId?: number
  receiverId?: string
}

interface UseChatMessagesReturn {
  messages: UiMessage[]
  handleSendMessage: (message: string, files?: UiFileAttachment[]) => Promise<void>
  handleEmojiSelect: (messageId: number, emoji: string) => Promise<void>
}

// Message Handlers
function useMessageHandlers(props: {
  messageType: 'channels' | 'dms',
  key: string,
  users: User[],
  currentUser: User
}) {
  const { updateReactions, setMessages, addMessage, deleteMessage } = useMessagesStore()
  
  const handleNewMessage = useCallback((message: DbMessage) => {
    const messageWithJoins: MessageWithJoins = {
      ...message,
      profiles: {
        user_id: message.user_id,
        username: props.users.find(u => u.user_id === message.user_id)?.username || null,
        profile_picture_url: props.users.find(u => u.user_id === message.user_id)?.profile_picture_url || null,
        status: props.users.find(u => u.user_id === message.user_id)?.status || null
      },
      files: null,
      reactions: null
    }
    const displayMessage = formatMessageForClient(messageWithJoins, props.currentUser.user_id)
    addMessage(props.messageType, props.key, displayMessage)
  }, [props.key, props.messageType, props.currentUser.user_id, props.users, addMessage])

  const handleMessageDelete = useCallback((message: DbMessage) => {
    deleteMessage(props.messageType, props.key, message.message_id)
  }, [props.key, props.messageType, deleteMessage])

  const handleMessageUpdate = useCallback((message: DbMessage) => {
    const messageWithJoins: MessageWithJoins = {
      ...message,
      profiles: {
        user_id: message.user_id,
        username: props.users.find(u => u.user_id === message.user_id)?.username || null,
        profile_picture_url: props.users.find(u => u.user_id === message.user_id)?.profile_picture_url || null,
        status: props.users.find(u => u.user_id === message.user_id)?.status || null
      },
      files: null,
      reactions: null
    }
    const displayMessage = formatMessageForClient(messageWithJoins, props.currentUser.user_id)
    const messages = useMessagesStore.getState().messages[props.messageType][props.key] || []
    setMessages(props.messageType, props.key, messages.map(msg => 
      msg.message_id === message.message_id ? {
        ...displayMessage,
        reactions: msg.reactions
      } : msg
    ))
  }, [props.key, props.messageType, props.currentUser.user_id, props.users, setMessages])

  const handleReactionUpdate = useCallback((messageId: number, reactions: MessageReaction[]) => {
    const displayReactions = formatReactions(reactions, props.currentUser.user_id)
    updateReactions(props.messageType, props.key, messageId, displayReactions)
  }, [props.key, props.messageType, props.currentUser.user_id, updateReactions])

  return {
    handleNewMessage,
    handleMessageDelete,
    handleMessageUpdate,
    handleReactionUpdate
  }
}

// Message Actions
function useMessageActions(props: {
  channelId?: number,
  receiverId?: string
}) {
  const handleSendMessage = async (message: string, files?: UiFileAttachment[]) => {
    try {
      await handleMessage({
        message,
        files,
        channelId: props.channelId,
        receiverId: props.receiverId
      })
    } catch (error) {
      console.error('Failed to send message:', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleEmojiSelect = useCallback(async (messageId: number, emoji: string) => {
    try {
      await addEmojiReaction({
        messageId,
        emoji
      })
    } catch (error) {
      console.error('Failed to toggle reaction:', error)
    }
  }, [])

  return {
    handleSendMessage,
    handleEmojiSelect
  }
}

// Main Hook
export function useChatMessages({
  messageType,
  key,
  users,
  currentUser,
  channelId,
  receiverId
}: UseChatMessagesProps): UseChatMessagesReturn {
  const { messages: storeMessages } = useMessagesStore()
  const currentMessages = storeMessages[messageType][key] || []

  const messageHandlers = useMessageHandlers({
    messageType,
    key,
    users,
    currentUser
  })

  const messageActions = useMessageActions({
    channelId,
    receiverId
  })

  // Setup real-time message updates
  useRealtimeMessages({
    channelId,
    receiverId,
    parentMessageId: undefined,
    onNewMessage: messageHandlers.handleNewMessage,
    onMessageDelete: messageHandlers.handleMessageDelete,
    onMessageUpdate: messageHandlers.handleMessageUpdate,
    onReactionUpdate: messageHandlers.handleReactionUpdate
  })

  return {
    messages: currentMessages,
    handleSendMessage: messageActions.handleSendMessage,
    handleEmojiSelect: messageActions.handleEmojiSelect
  }
} 
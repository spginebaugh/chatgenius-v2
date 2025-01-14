"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback, memo } from "react"
import { Channel, User, DbMessage, MessageFile, MessageReaction } from "@/types/database"
import { UiMessage } from "@/types/messages-ui"
import { FileAttachment } from "@/app/_lib/message-helpers"
import { ChatLayout } from "./chat-layout"
import { useMessagesStore } from "@/lib/stores/messages"
import { useChannelsStore } from "@/lib/stores/channels"
import { useRealtimeMessages } from "@/lib/client/hooks/use-realtime-messages"
import { useRealtimeUsers } from "@/lib/client/hooks/use-realtime-users"
import { useRealtimeChannels } from "@/lib/client/hooks/use-realtime-channels"
import { addEmojiReaction, handleMessage } from "@/app/actions/messages"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProfileSettingsPanel } from "./profile-settings-panel"
import { createClient } from "@/lib/supabase/client"
import { ChatClientFetch } from "./chat-client-fetch"

interface ChatClientProps {
  initialView: {
    type: 'channel' | 'dm'
    data: Channel | User
  }
  currentUser: User
  channels: Channel[]
  users: User[]
  initialMessages: UiMessage[]
}

function ChatClientComponent({ initialView, currentUser, channels, users, initialMessages }: ChatClientProps) {
  const router = useRouter()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const { updateReactions, setMessages, addMessage, deleteMessage, messages: storeMessages } = useMessagesStore()
  const { setActiveChannel } = useChannelsStore()
  
  // Store SSR users in local state
  const [storeUsers, setStoreUsers] = useState<User[]>(users)
  const [currentStoreUser, setCurrentStoreUser] = useState<User>(currentUser)

  // Get key and type based on view type
  const messageType = initialView.type === 'channel' ? 'channels' as const : 'dms' as const
  const key = initialView.type === 'channel' 
    ? `channels:${(initialView.data as Channel).id.toString()}` // Convert channel ID to string with prefix
    : `dms:${(initialView.data as User).id}` // DM user ID is already a string, add prefix

  // Get current messages for the active view
  const currentMessages = storeMessages[messageType][key] || []

  // Initialize messages store with initial data
  useEffect(() => {
    console.log("Effect running with:", {
      messageType,
      key,
      initialMessagesLength: initialMessages?.length,
      storeUsers: storeUsers?.length
    })

    if (!messageType || !key) {
      console.warn("Missing messageType or key:", { messageType, key })
      return
    }

    if (!Array.isArray(initialMessages)) {
      console.warn("initialMessages is not an array:", initialMessages)
      return
    }

    // Map messages using storeUsers for consistent user data
    const mappedMessages = initialMessages
      .filter((msg): msg is NonNullable<typeof msg> => msg !== null)
      .map(msg => {
        const user = storeUsers.find(u => u.id === msg.user_id)
        console.log("Mapping message:", {
          messageId: msg.id,
          userId: msg.user_id,
          foundUser: !!user
        })

        // Create the base message with user info
        const mappedMessage: UiMessage = {
          ...msg,
          profiles: {
            id: user?.id || msg.user_id,
            username: user?.username || ''
          },
          files: [],
          reactions: []
        }

        // If this message has thread messages, map those too
        if (msg.thread_messages?.length) {
          return {
            ...mappedMessage,
            thread_messages: msg.thread_messages.map(threadMsg => {
              const threadUser = storeUsers.find(u => u.id === threadMsg.user_id)
              return {
                ...threadMsg,
                profiles: {
                  id: threadUser?.id || threadMsg.user_id,
                  username: threadUser?.username || ''
                },
                files: [],
                reactions: []
              }
            })
          }
        }

        return mappedMessage
      })

    // Set messages in the store
    setMessages(messageType, key, mappedMessages)

    // Also initialize thread messages in the threads collection
    const threadMessages = mappedMessages
      .filter(msg => msg.thread_messages?.length)
      .flatMap(msg => msg.thread_messages || [])

    if (threadMessages.length) {
      // Group thread messages by parent ID and ensure parent_message_id is a number
      const threadsByParent = threadMessages.reduce((acc, msg) => {
        const parentId = msg.parent_message_id
        if (typeof parentId === 'number') {
          if (!acc[parentId]) acc[parentId] = []
          acc[parentId].push(msg)
        }
        return acc
      }, {} as Record<number, UiMessage[]>)

      // Set each thread's messages in the store
      Object.entries(threadsByParent).forEach(([parentId, messages]) => {
        const numericParentId = parseInt(parentId, 10)
        if (!isNaN(numericParentId)) {
          setMessages('threads', numericParentId, messages)
        }
      })
    }
  }, [key, messageType, initialMessages, setMessages, storeUsers])

  // Handle real-time user updates
  const handleUserUpdate = useCallback((updatedUser: User) => {
    console.log("Realtime user update:", updatedUser)
    setStoreUsers(prev => 
      prev.map(u => u.id === updatedUser.id ? updatedUser : u)
    )
    // Update current user if it's them
    if (updatedUser.id === currentStoreUser.id) {
      setCurrentStoreUser(updatedUser)
    }
  }, [currentStoreUser.id])

  // Setup real-time user updates
  useRealtimeUsers({
    onUserUpdate: handleUserUpdate
  })

  // Memoize message handlers
  const handleNewMessage = useCallback((message: DbMessage) => {
    console.log("Realtime new message:", message)
    
    // Check if message already exists in store
    const existingMessages = useMessagesStore.getState().messages[messageType][key] || []
    const existingMessage = existingMessages.find(m => m.id === message.id)
    
    // Always process the message if it doesn't exist or if it's more recent
    if (!existingMessage || new Date(message.inserted_at) > new Date(existingMessage.inserted_at)) {
      const user = storeUsers.find(u => u.id === message.user_id)
      const displayMessage = {
        ...message,
        profiles: {
          id: user?.id || '',
          username: user?.username || 'Unknown',
          status: user?.status
        },
        files: [],
        reactions: existingMessage?.reactions || []
      }
      addMessage(messageType, key, displayMessage)
    }
  }, [key, messageType, storeUsers, addMessage])

  const handleMessageDelete = useCallback((message: DbMessage) => {
    console.log("Realtime message delete:", message)
    deleteMessage(messageType, key, message.id)
  }, [key, messageType, deleteMessage])

  const handleMessageUpdate = useCallback((message: DbMessage) => {
    console.log("Realtime message update:", message)
    const user = storeUsers.find(u => u.id === message.user_id)
    const displayMessage: UiMessage = {
      ...message,
      profiles: {
        id: user?.id || message.user_id,
        username: user?.username || 'Unknown',
        profile_picture_url: user?.profile_picture_url,
        status: user?.status
      },
      files: [],
      reactions: []
    }
    const messages = useMessagesStore.getState().messages[messageType][key] || []
    setMessages(messageType, key, messages.map(msg => 
      msg.id === message.id ? {
        ...displayMessage,
        reactions: msg.reactions // Preserve existing reactions
      } : msg
    ))
  }, [key, messageType, storeUsers, setMessages])

  const handleReactionUpdate = useCallback((messageId: number, reactions: MessageReaction[]) => {
    console.log("Realtime reaction update:", { messageId, reactions })
    updateReactions(messageType, key, messageId, reactions)
  }, [key, messageType, updateReactions])

  // Setup real-time message updates
  useRealtimeMessages({
    channelId: initialView.type === 'channel' ? (initialView.data as Channel).id : undefined,
    receiverId: initialView.type === 'dm' ? (initialView.data as User).id : undefined,
    parentMessageId: undefined,
    onNewMessage: handleNewMessage,
    onMessageDelete: handleMessageDelete,
    onMessageUpdate: handleMessageUpdate,
    onReactionUpdate: handleReactionUpdate
  })

  // Setup realtime channel updates
  useRealtimeChannels({
    onChannelUpdate: (channel) => {
      console.log("Realtime channel update:", channel)
      setActiveChannel(channel.id)
    }
  })

  const handleSendMessage = async (message: string, files?: FileAttachment[]) => {
    try {
      await handleMessage({
        message,
        files,
        channelId: initialView.type === 'channel' ? (initialView.data as Channel).id : undefined,
        receiverId: initialView.type === 'dm' ? (initialView.data as User).id : undefined
      })
    } catch (error) {
      console.error('Failed to send message:', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    
    try {
      // Update user status to offline
      const updatedUser = { 
        ...currentStoreUser, 
        status: 'OFFLINE' as const, 
        last_active_at: new Date().toISOString() 
      }
      setCurrentStoreUser(updatedUser)
      setStoreUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u))

      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          status: 'OFFLINE',
          last_active_at: new Date().toISOString()
        })
        .eq('id', currentStoreUser.id)

      if (updateError) {
        console.error("Failed to update user status:", updateError.message)
      }

      // Reset message store
      useMessagesStore.getState().reset()

      // Then sign out
      const { error: signOutError } = await supabase.auth.signOut()
      
      if (signOutError) {
        console.error("Sign out failed:", signOutError.message)
        return
      }

      // Finally redirect
      router.push("/sign-in")
    } catch (error) {
      console.error("Logout failed:", error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleEmojiSelect = useCallback(async (messageId: number, emoji: string) => {
    try {
      await addEmojiReaction({
        messageId,
        emoji
      })
      // Let the realtime subscription handle the reaction update
    } catch (error) {
      console.error('Failed to toggle reaction:', error)
    }
  }, [])

  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<UiMessage | null>(null)

  const handleReaction = useCallback(async (message: UiMessage, emoji: string) => {
    try {
      await addEmojiReaction({
        messageId: message.id,
        emoji
      })
      // Let the realtime subscription handle the reaction update
    } catch (error) {
      console.error('Failed to toggle reaction:', error)
    }
  }, [])

  const handleThreadClick = useCallback((message: UiMessage) => {
    setSelectedMessage(message)
  }, [])

  return (
    <div className="relative">
      <ChatClientFetch 
        currentChannelId={initialView.type === 'channel' ? (initialView.data as Channel).id : undefined}
        currentDmUserId={initialView.type === 'dm' ? (initialView.data as User).id : undefined}
        currentUser={currentStoreUser}
      />
      <ChatLayout
        currentUser={currentStoreUser}
        users={storeUsers}
        channels={channels}
        messages={currentMessages}
        onSendMessage={handleSendMessage}
        onEmojiSelect={handleEmojiSelect}
        initialView={initialView}
      />
    </div>
  )
}

export const ChatClient = memo(ChatClientComponent) 
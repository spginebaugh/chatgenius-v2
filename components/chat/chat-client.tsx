"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { Channel, User } from "@/types/database"
import { ChatLayout } from "./chat-layout"
import { useMessagesStore } from "@/lib/stores/messages"
import { useUsersStore } from "@/lib/stores/users"
import { useChannelsStore } from "@/lib/stores/channels"
import { useMessages } from "@/lib/hooks/use-messages"
import { useRealtimeMessages } from "@/lib/hooks/use-realtime-messages"
import { useUsers } from "@/lib/hooks/use-users"
import { useChannels } from "@/lib/hooks/use-channels"
import { addEmojiReaction } from "@/app/actions/messages"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProfileSettingsPanel } from "./profile-settings-panel"
import { ReactionType } from '@/types/frontend'
import { createClient } from "@/utils/supabase/client"

interface ChatClientProps {
  initialView: {
    type: 'channel' | 'dm'
    data: Channel | User
  }
  currentUser: User
  channels: Channel[]
  users: User[]
  initialMessages: Array<{
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
    reactions?: ReactionType[]
  }>
}

export function ChatClient({ initialView, currentUser, channels, users, initialMessages }: ChatClientProps) {
  const router = useRouter()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const { updateReactions, setMessages, addMessage, deleteMessage } = useMessagesStore()
  const { updateUserStatus, setUsers: setStoreUsers, setCurrentUser } = useUsersStore()
  const { setActiveChannel } = useChannelsStore()
  const { users: realtimeUsers } = useUsers()

  // Initialize stores with initial data
  useEffect(() => {
    setStoreUsers(users)
    setCurrentUser(currentUser)
    setMessages(initialView.type === 'channel' 
      ? String((initialView.data as Channel).channel_id)
      : String((initialView.data as User).id), 
      initialMessages
    )

    users.forEach(user => {
      if (user.status === 'ONLINE') {
        updateUserStatus(user.id, 'ONLINE')
      }
    })
  }, [setStoreUsers, setCurrentUser, setMessages, updateUserStatus, users, currentUser, initialMessages, initialView])

  // Update local state when realtime users change
  useEffect(() => {
    const updatedCurrentUser = realtimeUsers[currentUser.id]
    if (updatedCurrentUser) {
      setCurrentUser(updatedCurrentUser)
    }
  }, [realtimeUsers, currentUser.id, setCurrentUser])

  // Get key and ID based on view type
  const key = initialView.type === 'channel' 
    ? String((initialView.data as Channel).channel_id)
    : String((initialView.data as User).id)

  // Get messages and actions
  const { messages, sendMessage } = useMessages({
    channelId: initialView.type === 'channel' ? key : undefined,
    userId: currentUser.id,
    viewType: initialView.type,
    currentViewData: {
      id: key,
      type: initialView.type
    }
  })

  // Setup real-time message updates
  useRealtimeMessages({
    channelId: initialView.type === 'channel' ? key : undefined,
    userId: initialView.type === 'dm' ? key : undefined,
    viewType: initialView.type,
    currentViewData: initialView.data as User,
    onNewMessage: (message) => {
      addMessage(key, message)
    },
    onNewThreadMessage: (parentId, message) => {
      // Handle thread message updates if needed
    },
    onMessageDelete: (messageId) => {
      deleteMessage(key, messageId)
    },
    onReactionChange: (messageId, reactions, parentType) => {
      updateReactions(key, messageId, reactions || [], parentType)
    }
  })

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      
      // First set user status to offline
      await supabase
        .from('users')
        .update({ 
          status: 'OFFLINE',
          last_active_at: new Date().toISOString()
        })
        .eq('id', currentUser.id)

      // Then sign out
      await supabase.auth.signOut()
      
      // Finally redirect
      router.push("/sign-in")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const handleEmojiSelect = useCallback(async (messageId: string, emoji: string, parent_type?: 'channel_message' | 'direct_message' | 'thread_message') => {
    try {
      const existingMessage = messages.find(msg => msg.id === messageId)
      if (!existingMessage) return

      // Use provided parent_type or determine based on view type
      const messageParentType = parent_type || (initialView.type === 'channel' ? 'channel_message' : 'direct_message')

      // Call the server action to toggle the reaction
      await addEmojiReaction({
        parentId: messageId,
        parentType: messageParentType,
        emoji
      })

      // Update local state through the store
      const existingReactions = existingMessage.reactions || []
      const reactionExists = existingReactions.some(r => r.emoji === emoji)

      const newReactions: ReactionType[] = reactionExists
        ? existingReactions.filter(r => r.emoji !== emoji)
        : [...existingReactions, { emoji, count: 1, reacted_by_me: true }]

      updateReactions(key, messageId, newReactions, messageParentType)
    } catch (error) {
      console.error('Failed to toggle reaction:', error)
    }
  }, [key, messages, updateReactions, initialView.type])

  return (
    <div className="relative">
      <ChatLayout
        currentView={initialView}
        messages={messages}
        onSendMessage={sendMessage}
        onEmojiSelect={handleEmojiSelect}
        channels={channels}
        users={Object.values(realtimeUsers)}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className="absolute top-1 right-4 bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded flex items-center gap-3 border border-white/20"
          >
            <div className="flex items-center gap-2">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium leading-none">{realtimeUsers[currentUser.id]?.username || currentUser?.username || 'User'}</span>
                <span className="text-xs text-gray-300 flex items-center gap-1 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${realtimeUsers[currentUser.id]?.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-500'}`} />
                  {realtimeUsers[currentUser.id]?.status?.toLowerCase() || currentUser?.status?.toLowerCase() || 'offline'}
                </span>
              </div>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px] bg-gray-100 border-gray-400 text-gray-900">
          <DropdownMenuItem 
            className="hover:bg-gray-200 focus:bg-gray-200 cursor-pointer"
            onClick={() => setIsProfileOpen(true)}
          >
            Change Username
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="hover:bg-gray-200 focus:bg-gray-200 cursor-pointer text-gray-900" 
            onClick={handleLogout}
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isProfileOpen && (
        <div className="absolute right-0 top-0 h-full">
          <div className="flex h-[calc(100vh-3.5rem)] mt-14">
            <ProfileSettingsPanel
              currentUsername={realtimeUsers[currentUser.id]?.username || currentUser?.username || ''}
              onClose={() => setIsProfileOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
} 
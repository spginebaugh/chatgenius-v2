"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Channel, User } from "@/types/database"
import { ReactionType } from "@/types/frontend"
import { ChatLayout } from "./chat-layout"
import { sendMessage, sendDirectMessage, addEmojiReaction } from "@/app/actions/chat"
import { logout, updateUsername } from "@/app/actions"
import { useRealtimeMessages } from "@/hooks/use-realtime-messages"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProfileSettingsPanel } from "./profile-settings-panel"
import Link from "next/link"

interface ChatClientProps {
  channels: Channel[]
  users: User[]
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
    reactions?: ReactionType[]
  }>
  currentView: {
    type: "channel" | "dm"
    data: Channel | User
  }
  currentUser?: User
}

interface ReactionSummary {
  emoji: string
  count: number
  reacted_by_me: boolean
}

export function ChatClient({
  channels,
  users,
  messages: initialMessages,
  currentView,
  currentUser
}: ChatClientProps) {
  const router = useRouter()
  const [messages, setMessages] = useState(initialMessages)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  useEffect(() => {
    if (!currentView.data) {
      router.push("/")
    }
  }, [currentView.data, router])

  const handleNewMessage = (message: typeof messages[0]) => {
    setMessages((prev) => [...prev, message])
  }

  const handleNewThreadMessage = (parentId: string, threadMessage: typeof messages[0]) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === parentId) {
          return {
            ...msg,
            thread_messages: [...(msg.thread_messages || []), threadMessage],
          }
        }
        return msg
      })
    )
  }

  const handleMessageDelete = (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
  }

  const handleReactionChange = (messageId: string, reactions: ReactionType[] | undefined, parentType: 'channel_message' | 'direct_message' | 'thread_message') => {
    setMessages(prevMessages => {
      return prevMessages.map(message => {
        if (parentType === 'thread_message') {
          if (message.thread_messages) {
            return {
              ...message,
              thread_messages: message.thread_messages.map(tm => 
                tm.id === messageId ? { ...tm, reactions } : tm
              )
            }
          }
        } else if (message.id === messageId) {
          return { ...message, reactions }
        }
        return message
      })
    })
  }

  useRealtimeMessages({
    channelId: currentView.type === "channel" ? (currentView.data as Channel).channel_id.toString() : undefined,
    userId: currentView.type === "dm" ? currentUser?.id : undefined,
    viewType: currentView.type,
    currentViewData: currentView.type === "dm" ? currentView.data as User : undefined,
    onNewMessage: handleNewMessage,
    onNewThreadMessage: handleNewThreadMessage,
    onMessageDelete: handleMessageDelete,
    onReactionChange: handleReactionChange,
  })

  const handleSendMessage = async (message: string) => {
    if (currentView.type === "channel") {
      await sendMessage({
        channelId: (currentView.data as Channel).channel_id.toString(),
        message
      })
    } else {
      await sendDirectMessage({
        receiverId: (currentView.data as User).id,
        message
      })
    }
  }

  const handleLogout = async () => {
    try {
      const result = await logout()
      if (result.success) {
        router.push("/sign-in")
      }
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const handleUpdateUsername = async (newUsername: string) => {
    try {
      const result = await updateUsername(newUsername)
      if (result.error) {
        console.error("Failed to update username:", result.error)
        return
      }
      setIsProfileOpen(false)
    } catch (error) {
      console.error("Failed to update username:", error)
    }
  }

  const handleEmojiSelect = async (
    messageId: string, 
    emoji: string, 
    parent_type: 'channel_message' | 'direct_message' | 'thread_message'
  ) => {
    try {
      await addEmojiReaction({
        parentId: messageId,
        parentType: parent_type,
        emoji
      })
    } catch (error) {
      console.error("Failed to add emoji reaction:", error)
    }
  }

  return (
    <div className="relative">
      <ChatLayout
        channels={channels}
        users={users}
        messages={messages}
        currentView={currentView}
        onSendMessage={handleSendMessage}
        onEmojiSelect={handleEmojiSelect}
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
                <span className="text-sm font-medium leading-none">{currentUser?.username || 'User'}</span>
                <span className="text-xs text-gray-300 flex items-center gap-1 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${currentUser?.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-500'}`} />
                  {currentUser?.status?.toLowerCase() || 'offline'}
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
              currentUsername={currentUser?.username || ''}
              onClose={() => setIsProfileOpen(false)}
              onUpdateUsername={handleUpdateUsername}
            />
          </div>
        </div>
      )}
    </div>
  )
} 
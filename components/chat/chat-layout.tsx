"use client"

import { useState } from "react"
import type { UiMessage, UiFileAttachment } from "@/types/messages-ui"
import { Sidebar } from "."
import { MessageList } from "./message/message-list"
import { MessageInput } from "./message/message-input"
import { ThreadPanel } from "./thread-panel"
import { handleMessage } from "@/app/actions/messages/index"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ProfileSettingsPanel } from "./profile-settings-panel"
import { ChatViewData, UserAvatar, THEME_COLORS } from "./shared"
import type { User, Channel } from "@/types/database"

interface ChatLayoutProps {
  currentUser: User
  users: User[]
  channels: Channel[]
  messages: UiMessage[]
  onSendMessage: (message: string, files?: UiFileAttachment[], isRagQuery?: boolean) => Promise<void>
  onEmojiSelect: (messageId: number, emoji: string) => Promise<void>
  initialView: ChatViewData
  isLoading?: boolean
}

export function ChatLayout({
  currentUser,
  users,
  channels,
  messages,
  onSendMessage,
  onEmojiSelect,
  initialView,
  isLoading = false
}: ChatLayoutProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<UiMessage | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    try {
      // Update user status to offline
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          status: 'OFFLINE',
          last_active_at: new Date().toISOString()
        })
        .eq('id', currentUser.id)

      if (updateError) {
        console.error("Failed to update user status:", updateError.message)
      }

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

  const handleThreadClick = (message: UiMessage) => {
    setSelectedMessage(message)
  }

  const handleThreadClose = () => {
    setSelectedMessage(null)
  }

  const handleMainMessage = async (message: string, files?: UiFileAttachment[], isRagQuery?: boolean) => {
    try {
      await handleMessage({
        message,
        files,
        isRagQuery,
        channelId: initialView.type === 'channel' ? (initialView.data as Channel).id : undefined,
        receiverId: initialView.type === 'dm' ? (initialView.data as User).id : undefined
      })
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        channels={channels}
        storeUsers={users}
        currentView={initialView}
      />
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <div className="h-14 bg-[#333F48] flex items-center justify-between px-4 flex-shrink-0">
          <div className="text-white font-semibold">
            {initialView.type === 'channel' ? (
              <span>#{(initialView.data as Channel).slug}</span>
            ) : (
              <span>{(initialView.data as User).username}</span>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="flex items-center gap-2 text-white hover:bg-gray-700 px-3 py-1.5 rounded transition-colors"
              >
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
                  <span className="text-sm font-medium leading-none">
                    {currentUser.username || 'User'}
                  </span>
                  <span className="text-xs text-gray-300 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${currentUser.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-500'}`} />
                    {currentUser.status?.toLowerCase() || 'offline'}
                  </span>
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
        </div>
        <div className="flex flex-1 min-w-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto text-gray-900">
              <MessageList 
                messages={messages} 
                onReactionSelect={onEmojiSelect}
                onThreadSelect={(messageId) => {
                  const message = messages.find(m => m.id === messageId)
                  if (message) handleThreadClick(message)
                }}
              />
            </div>
            <div className="flex-shrink-0">
              <MessageInput 
                placeholder={
                  initialView.type === 'channel' 
                    ? `Message #${(initialView.data as Channel).slug}` 
                    : `Message ${(initialView.data as User).username}`
                }
                onSendMessage={handleMainMessage}
                isLoading={isLoading}
              />
            </div>
          </div>
          {selectedMessage && (
            <ThreadPanel
              parentMessage={selectedMessage}
              currentUserId={currentUser.id}
              onSendMessage={handleMainMessage}
              onClose={handleThreadClose}
              onEmojiSelect={onEmojiSelect}
            />
          )}
        </div>
      </div>
      {isProfileOpen && (
        <div className="absolute right-0 top-0 h-full">
          <ProfileSettingsPanel
            currentUsername={currentUser.username || ''}
            onClose={() => setIsProfileOpen(false)}
          />
        </div>
      )}
    </div>
  )
} 
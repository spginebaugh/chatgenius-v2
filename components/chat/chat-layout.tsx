"use client"

// Imports
// -----------------------------------------------
import { useState } from "react"
import type { UiMessage, UiFileAttachment } from "@/types/messages-ui"
import type { ChatLayoutProps } from "./shared/types"
import { useLogout, useMessageHandling } from "./layout/hooks"
import { Header, MainContent } from "./layout/components"
import { Sidebar } from "."
import { ThreadPanel } from "./thread-panel"
import { ProfileSettingsPanel } from "./profile-settings-panel"

// Main Component
// -----------------------------------------------
export function ChatLayout({
  currentUser,
  users,
  channels,
  messages,
  onSendMessage: onSendMessageProp,
  onEmojiSelect,
  initialView,
  isLoading = false
}: ChatLayoutProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<UiMessage | null>(null)
  const { handleLogout } = useLogout(currentUser)
  const { handleMainMessage } = useMessageHandling()

  const handleThreadClick = (messageId: number) => {
    const message = messages.find(m => m.message_id === messageId)
    if (message) setSelectedMessage(message)
  }

  const handleThreadClose = () => {
    setSelectedMessage(null)
  }

  const handleMessageSend = (message: string, files?: UiFileAttachment[], isRagQuery?: boolean, isImageGeneration?: boolean) => {
    if (selectedMessage) {
      return handleMainMessage(message, initialView, files, isRagQuery, selectedMessage.message_id, isImageGeneration)
    }
    return handleMainMessage(message, initialView, files, isRagQuery, undefined, isImageGeneration)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        channels={channels}
        storeUsers={users}
        currentView={initialView}
      />
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <Header 
          currentUser={currentUser}
          currentView={initialView}
          onProfileClick={() => setIsProfileOpen(true)}
          onLogout={handleLogout}
        />
        <div className="flex flex-1 min-w-0 overflow-hidden">
          <MainContent 
            messages={messages}
            currentView={initialView}
            isLoading={isLoading}
            onReactionSelect={onEmojiSelect}
            onThreadSelect={handleThreadClick}
            onSendMessage={handleMessageSend}
          />
          {selectedMessage && (
            <ThreadPanel 
              selectedMessage={selectedMessage}
              currentUserId={currentUser.user_id}
              onSendMessage={handleMessageSend}
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
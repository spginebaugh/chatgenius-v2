"use client"

import { useState } from "react"
import { Channel, User } from "@/types/database"
import { ReactionType } from "@/types/frontend"
import { Sidebar } from "."
import { MessageList } from "."
import { MessageInput } from "."
import { ThreadPanel } from "./thread-panel"
import { sendThreadMessage } from "@/app/actions/chat"

interface ChatLayoutProps {
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
  onSendMessage: (message: string) => Promise<void>
  onEmojiSelect: (messageId: string, emoji: string, parent_type: 'channel_message' | 'direct_message' | 'thread_message') => void
}

export function ChatLayout({
  channels,
  users,
  messages,
  currentView,
  onSendMessage,
  onEmojiSelect
}: ChatLayoutProps) {
  const [selectedThread, setSelectedThread] = useState<ChatLayoutProps["messages"][0] | null>(null)

  const handleSendThreadMessage = async (message: string) => {
    if (selectedThread) {
      try {
        await sendThreadMessage({
          parentId: parseInt(selectedThread.id),
          parentType: currentView.type === "channel" ? "channel_message" : "direct_message",
          message
        })
      } catch (error) {
        console.error("Failed to send thread message:", error)
      }
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        channels={channels}
        users={users}
        currentView={currentView}
      />

      <div className="flex-1 flex flex-col bg-white">
        <div className="h-14 bg-[#333F48] flex items-center px-4">
          <div className="flex items-center text-white">
            {currentView.type === "dm" ? (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                <h2 className="font-semibold">{(currentView.data as User).username}</h2>
              </>
            ) : (
              <h2 className="font-semibold">#{(currentView.data as Channel).slug}</h2>
            )}
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          <div className={`flex-1 flex flex-col ${selectedThread ? 'border-r border-gray-200' : ''}`}>
            <div className="flex-1 min-h-0">
              <MessageList 
                messages={messages} 
                onThreadClick={setSelectedThread}
                onEmojiSelect={onEmojiSelect}
                viewType={currentView.type}
              />
            </div>
            
            <MessageInput
              placeholder={
                currentView.type === "dm"
                  ? `Message ${(currentView.data as User).username}`
                  : `Message #${(currentView.data as Channel).slug}`
              }
              onSendMessage={onSendMessage}
            />
          </div>

          {selectedThread && (
            <ThreadPanel
              parentMessage={selectedThread}
              onClose={() => setSelectedThread(null)}
              onSendMessage={handleSendThreadMessage}
              onEmojiSelect={onEmojiSelect}
            />
          )}
        </div>
      </div>
    </div>
  )
} 
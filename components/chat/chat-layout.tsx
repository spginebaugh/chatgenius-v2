"use client"

import { Channel, User } from "@/types/database"
import { Sidebar } from "."
import { MessageList } from "."
import { MessageInput } from "."

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
  }>
  currentView: {
    type: "channel" | "dm"
    data: Channel | User
  }
  onSendMessage: (message: string) => Promise<void>
}

export function ChatLayout({
  channels,
  users,
  messages,
  currentView,
  onSendMessage
}: ChatLayoutProps) {
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

        <MessageList messages={messages} />
        
        <MessageInput
          placeholder={
            currentView.type === "dm"
              ? `Message ${(currentView.data as User).username}`
              : `Message #${(currentView.data as Channel).slug}`
          }
          onSendMessage={onSendMessage}
        />
      </div>
    </div>
  )
} 
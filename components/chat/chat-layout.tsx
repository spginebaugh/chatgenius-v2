"use client"

import { useState } from "react"
import { Channel, User } from "@/types/database"
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
  const [activeThread, setActiveThread] = useState<{
    parentMessage: typeof messages[0]
    responses: NonNullable<typeof messages[0]["thread_messages"]>
  } | null>(null)

  const handleThreadMessage = async (message: string) => {
    try {
      const result = await sendThreadMessage({
        parentId: parseInt(activeThread!.parentMessage.id),
        parentType: currentView.type === "channel" ? "channel" : "direct",
        message
      });

      if (result.error) {
        console.error("Failed to send thread message:", result.error);
        // You might want to show an error toast/notification here
        return;
      }

      // Update the local state with the new message while we wait for revalidation
      if (activeThread && result.data) {
        setActiveThread({
          ...activeThread,
          responses: [
            ...activeThread.responses,
            {
              id: result.data.id.toString(),
              message: result.data.message,
              inserted_at: result.data.inserted_at,
              profiles: result.data.profiles
            }
          ]
        });
      }
    } catch (error) {
      console.error("Error sending thread message:", error);
      // You might want to show an error toast/notification here
    }
  };

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
          <div className={`flex-1 flex flex-col ${activeThread ? 'border-r border-gray-200' : ''}`}>
            <div className="flex-1 min-h-0">
              <MessageList 
                messages={messages} 
                onThreadClick={(message) => {
                  setActiveThread({
                    parentMessage: message,
                    responses: message.thread_messages || []
                  })
                }}
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

          {activeThread && (
            <ThreadPanel
              parentMessage={activeThread.parentMessage}
              responses={activeThread.responses}
              onClose={() => setActiveThread(null)}
              onSendMessage={handleThreadMessage}
            />
          )}
        </div>
      </div>
    </div>
  )
} 
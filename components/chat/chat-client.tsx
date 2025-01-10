"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Channel, User } from "@/types/database"
import { ChatLayout } from "./chat-layout"
import { sendMessage, sendDirectMessage } from "@/app/actions/chat"
import { logout } from "@/app/actions"

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
  }>
  currentView: {
    type: "channel" | "dm"
    data: Channel | User
  }
  currentUser?: User
}

export function ChatClient({
  channels,
  users,
  messages,
  currentView,
  currentUser
}: ChatClientProps) {
  const router = useRouter()

  useEffect(() => {
    if (!currentView.data) {
      router.push("/")
    }
  }, [currentView.data, router])

  const handleSendMessage = async (message: string) => {
    if (currentView.type === "channel") {
      await sendMessage({
        channelId: (currentView.data as Channel).id.toString(),
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

  return (
    <div className="relative">
      <ChatLayout
        channels={channels}
        users={users}
        messages={messages}
        currentView={currentView}
        onSendMessage={handleSendMessage}
      />
      <button 
        onClick={handleLogout}
        className="absolute top-4 right-4 text-white hover:text-gray-300"
      >
        Logout
      </button>
    </div>
  )
} 
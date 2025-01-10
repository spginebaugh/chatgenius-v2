"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Channel, User } from "@/types/database"
import { ChatLayout } from "./chat-layout"
import { sendMessage, sendDirectMessage } from "@/app/actions/chat"
import { logout } from "@/app/actions"
import { useRealtimeMessages } from "@/hooks/use-realtime-messages"

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
  messages: initialMessages,
  currentView,
  currentUser
}: ChatClientProps) {
  const router = useRouter()
  const [messages, setMessages] = useState(initialMessages)

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

  useRealtimeMessages({
    channelId: currentView.type === "channel" ? (currentView.data as Channel).id.toString() : undefined,
    userId: currentView.type === "dm" ? currentUser?.id : undefined,
    onNewMessage: handleNewMessage,
    onNewThreadMessage: handleNewThreadMessage,
    onMessageDelete: handleMessageDelete,
  })

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
"use client"

import { useRouter } from "next/navigation"
import { memo } from "react"
import type { User, Channel } from "@/types/database"
import type { UiMessage } from "@/types/messages-ui"
import { ChatLayout } from "./chat-layout"
import { ChatClientFetch } from "./client/chat-client-fetch"
import { ChatViewData } from "./shared"
import { ChatProvider } from "./providers/chat-provider"
import { useUsers } from "./providers/users-provider"
import { useMessages } from "./providers/messages-provider"
import { getViewKeyAndType } from "./utils/view-helpers"

interface ChatClientProps {
  initialView: ChatViewData
  currentUser: User
  channels: Channel[]
  users: User[]
  initialMessages: UiMessage[]
}

interface ChatContentProps {
  initialView: ChatViewData
  channels: Channel[]
  initialMessages: UiMessage[]
}

function ChatContent({ initialView, channels, initialMessages }: ChatContentProps) {
  const router = useRouter()
  const { users, currentUser, handleLogout } = useUsers()
  const { messages, handleSendMessage, handleEmojiSelect } = useMessages()
  const { channelId, receiverId } = getViewKeyAndType(initialView)

  // Handle logout with router redirect
  const handleLogoutWithRedirect = async () => {
    await handleLogout()
    router.push("/sign-in")
  }

  return (
    <div className="relative">
      <ChatClientFetch 
        currentChannelId={channelId}
        currentDmUserId={receiverId}
        currentUser={currentUser}
        skipInitialFetch={!!initialMessages}
        initialMessages={initialMessages}
      />
      <ChatLayout
        currentUser={currentUser}
        users={users}
        channels={channels}
        messages={messages}
        onSendMessage={handleSendMessage}
        onEmojiSelect={handleEmojiSelect}
        initialView={initialView}
      />
    </div>
  )
}

function ChatClientComponent(props: ChatClientProps) {
  return (
    <ChatProvider {...props}>
      <ChatContent 
        initialView={props.initialView} 
        channels={props.channels}
        initialMessages={props.initialMessages}
      />
    </ChatProvider>
  )
}

export const ChatClient = memo(ChatClientComponent) 
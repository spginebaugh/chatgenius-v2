"use client"

import { useRouter } from "next/navigation"
import { memo, useMemo } from "react"
import type { User, Channel } from "@/types/database"
import type { UiMessage } from "@/types/messages-ui"
import type { ChatViewData } from "./shared/types"
import { ChatLayout } from "./chat-layout"
import { useUsers } from "./providers/users-provider"
import { getViewKeyAndType } from "./utils/view-helpers"
import { useChannelMessages } from "./hooks/use-channel-messages"
import { useDirectMessages } from "./hooks/use-direct-messages"
import { UsersProvider } from "./providers/users-provider"
import { addEmojiReaction } from "@/app/actions/messages"

interface ChatClientProps {
  initialView: ChatViewData
  currentUser: User
  channels: Channel[]
  users: User[]
  initialMessages: UiMessage[]
}

const ChatContent = memo(function ChatContent({ 
  initialView, 
  channels, 
  initialMessages 
}: { 
  initialView: ChatViewData
  channels: Channel[]
  initialMessages: UiMessage[]
}) {
  const router = useRouter()
  const { users, currentUser, handleLogout } = useUsers()
  const { channelId, receiverId } = useMemo(() => getViewKeyAndType(initialView), [initialView])

  // If no current user, we can't load messages
  if (!currentUser) {
    return <div>Loading user data...</div>
  }

  // Use the appropriate messages hook based on the view type
  const channelMessages = channelId ? useChannelMessages(channelId, currentUser.user_id) : null
  const directMessages = receiverId ? useDirectMessages(currentUser.user_id, receiverId) : null

  // Get the active messages and send function based on view type
  const activeMessages = channelId ? channelMessages : directMessages
  const messages = activeMessages?.messages || []
  const sendMessage = activeMessages?.sendMessage || (async () => {})

  // Handle logout with router redirect
  const handleLogoutWithRedirect = async () => {
    await handleLogout()
    router.push("/sign-in")
  }

  // Handle emoji reactions
  const handleEmojiSelect = async (messageId: number, emoji: string) => {
    try {
      await addEmojiReaction({ messageId, emoji })
    } catch (error) {
      console.error('Failed to add emoji reaction:', error)
    }
  }

  return (
    <div className="relative">
      <ChatLayout
        channels={channels}
        users={users}
        currentUser={currentUser}
        messages={messages}
        onSendMessage={sendMessage}
        onEmojiSelect={handleEmojiSelect}
        initialView={initialView}
      />
    </div>
  )
})

const ChatClientComponent = memo(function ChatClientComponent({
  initialView,
  currentUser,
  channels,
  users,
  initialMessages
}: ChatClientProps) {
  return (
    <UsersProvider initialUsers={users} initialCurrentUser={currentUser}>
      <ChatContent
        initialView={initialView}
        channels={channels}
        initialMessages={initialMessages}
      />
    </UsersProvider>
  )
})

export { ChatClientComponent as ChatClient } 
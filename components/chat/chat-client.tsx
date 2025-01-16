"use client"

import { useRouter } from "next/navigation"
import { memo } from "react"
import type { User, Channel } from "@/types/database"
import type { UiMessage } from "@/types/messages-ui"
import type { ChatViewData } from "./shared/types"
import { ChatLayout } from "./chat-layout"
import { useUsers } from "./providers/users-provider"
import { getViewKeyAndType } from "./utils/view-helpers"
import { useChannelMessages } from "./hooks/use-channel-messages"
import { useDirectMessages } from "./hooks/use-direct-messages"
import { UsersProvider } from "./providers/users-provider"

interface ChatClientProps {
  initialView: ChatViewData
  currentUser: User
  channels: Channel[]
  users: User[]
  initialMessages: UiMessage[]
}

function ChatContent({ initialView, channels, initialMessages }: { 
  initialView: ChatViewData
  channels: Channel[]
  initialMessages: UiMessage[]
}) {
  const router = useRouter()
  const { users, currentUser, handleLogout } = useUsers()
  const { channelId, receiverId } = getViewKeyAndType(initialView)

  // Use the appropriate messages hook based on the view type
  const channelMessages = channelId ? useChannelMessages(channelId, currentUser.user_id) : null
  const directMessages = receiverId ? useDirectMessages(currentUser.user_id, receiverId) : null

  // Get the active messages and send function based on view type
  const { messages, sendMessage } = (channelId ? channelMessages : directMessages) ?? { messages: [], sendMessage: async () => {} }

  // Handle logout with router redirect
  const handleLogoutWithRedirect = async () => {
    await handleLogout()
    router.push("/sign-in")
  }

  // Temporary emoji handler that returns a Promise
  const handleEmojiSelect = async (_messageId: number, _emoji: string) => {
    // TODO: Implement emoji handling
    return Promise.resolve()
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
}

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
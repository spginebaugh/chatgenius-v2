import { redirect } from "next/navigation"
import { createClient } from "@/app/_lib/supabase-server"
import { ChatClient } from "@/components/chat"
import { DbMessage as Message, Channel, User, MessageReaction, MessageType, MessageFile } from "@/types/database"
import { UiMessage } from "@/types/messages-ui"
import { requireAuth } from '@/app/_lib/auth'
import { getChannels, getUsers } from '@/app/_lib'

interface ChatServerProps {
  viewType: "channel" | "dm"
  id: string
}

// Base message type without thread_messages to avoid recursion
interface BaseMessage extends Omit<UiMessage, 'thread_messages' | 'profiles'> {
  profiles: {
    id: string
    username: string  // We'll ensure this is never null when formatting
  }
  files?: MessageFile[]
  reactions?: Array<{
    emoji: string
    count: number
    reacted_by_me: boolean
  }>
}

// Message type with thread messages
type DisplayMessage = BaseMessage & {
  thread_messages?: DisplayMessage[]
}

export async function ChatServer({ viewType, id }: ChatServerProps) {
  const supabase = await createClient()
  const user = await requireAuth({ throwOnMissingProfile: true })

  // 1. Fetch Channels, Users, and Current View Data with complete profiles
  const [channels, allUsers, currentViewData, messagesResponse] = await Promise.all([
    getChannels(),
    getUsers(),
    supabase
      .from(viewType === "channel" ? "channels" : "users")
      .select("*")
      .eq("id", id)
      .single(),
    supabase
      .from("messages")
      .select(`
        id,
        message,
        message_type,
        user_id,
        channel_id,
        receiver_id,
        parent_message_id,
        thread_count,
        inserted_at,
        profiles:users!messages_user_id_fkey (
          id,
          username,
          profile_picture_url,
          status
        ),
        files:message_files (
          id,
          file_type,
          file_url
        ),
        reactions:message_reactions (
          id,
          emoji,
          user_id,
          message_id,
          inserted_at
        )
      `)
      .eq(viewType === "channel" ? "channel_id" : "message_type", viewType === "channel" ? id : "direct")
      .is("parent_message_id", null) // Only fetch top-level messages
      .order("inserted_at", { ascending: true })
  ])

  const messages = messagesResponse.data || []
  const currentView = currentViewData.data
  if (!currentView) {
    console.log('[ChatServer] No current view data, redirecting to home')
    redirect("/")
  }

  // 2. Get current user data with complete profile
  const { data: currentUserData } = await supabase
    .from("users")
    .select("id, username, bio, profile_picture_url, last_active_at, status, inserted_at")
    .eq("id", user.id)
    .single()

  if (!currentUserData) {
    redirect("/sign-in")
  }

  // 3. Format reactions with proper user data
  const formatReactionsForDisplay = (reactions: MessageReaction[]) => {
    const reactionsByEmoji = new Map<string, Set<string>>()
    
    reactions.forEach(reaction => {
      if (!reactionsByEmoji.has(reaction.emoji)) {
        reactionsByEmoji.set(reaction.emoji, new Set())
      }
      reactionsByEmoji.get(reaction.emoji)!.add(reaction.user_id)
    })

    return Array.from(reactionsByEmoji.entries()).map(([emoji, users]) => ({
      emoji,
      count: users.size,
      reacted_by_me: users.has(user.id)
    }))
  }

  // 4. Format messages with complete data
  const formattedMessages = messages.map((msg: any) => ({
    id: msg.id,
    message: msg.message,
    message_type: msg.message_type,
    user_id: msg.user_id,
    channel_id: msg.channel_id,
    receiver_id: msg.receiver_id,
    parent_message_id: msg.parent_message_id,
    thread_count: msg.thread_count,
    inserted_at: msg.inserted_at,
    profiles: {
      id: msg.profiles.id,
      username: msg.profiles.username || 'Unknown',
      profile_picture_url: msg.profiles.profile_picture_url,
      status: msg.profiles.status
    },
    files: msg.files || [],
    reactions: formatReactionsForDisplay(msg.reactions || [])
  }))

  // 5. Return the ChatClient component with complete data
  return (
    <ChatClient
      initialView={{
        type: viewType,
        data: currentView
      }}
      currentUser={currentUserData}
      channels={channels}
      users={allUsers}
      initialMessages={formattedMessages}
    />
  )
} 
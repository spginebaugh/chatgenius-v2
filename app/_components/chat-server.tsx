import { redirect } from "next/navigation"
import { createClient } from "@/app/_lib/supabase-server"
import { ChatClient } from "@/components/chat"
import { DbMessage as Message, Channel, User, MessageReaction, MessageType, MessageFile, UserStatus } from "@/types/database"
import { UiMessage, UiMessageReaction } from "@/types/messages-ui"
import { requireAuth } from '@/app/_lib/auth'
import { getChannels, getUsers } from '@/app/_lib'

interface ChatServerProps {
  viewType: "channel" | "dm"
  id: string
}

// Type without thread_messages to avoid recursion in certain operations
type NoThreadMessage = Omit<UiMessage, 'thread_messages'>

const MESSAGE_QUERY = `
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
`

async function fetchViewData(viewType: "channel" | "dm", id: string) {
  const supabase = await createClient()
  const { data: currentView } = await supabase
    .from(viewType === "channel" ? "channels" : "users")
    .select("*")
    .eq("id", id)
    .single()

  if (!currentView) {
    console.log('[ChatServer] No current view data, redirecting to home')
    redirect("/")
  }

  return currentView
}

async function fetchMessages(viewType: "channel" | "dm", id: string) {
  const supabase = await createClient()
  const { data: messages } = await supabase
    .from("messages")
    .select(MESSAGE_QUERY)
    .eq(viewType === "channel" ? "channel_id" : "message_type", viewType === "channel" ? id : "direct")
    .is("parent_message_id", null)
    .order("inserted_at", { ascending: true })

  return messages || []
}

async function fetchCurrentUser(userId: string) {
  const supabase = await createClient()
  const { data: currentUser } = await supabase
    .from("users")
    .select("id, username, bio, profile_picture_url, last_active_at, status, inserted_at")
    .eq("id", userId)
    .single()

  if (!currentUser) {
    redirect("/sign-in")
  }

  return currentUser
}

function formatReactionsForDisplay(reactions: MessageReaction[], currentUserId: string): UiMessageReaction[] {
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
    reacted_by_me: users.has(currentUserId)
  }))
}

function formatMessage(msg: any, currentUserId: string): UiMessage {
  return {
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
    reactions: formatReactionsForDisplay(msg.reactions || [], currentUserId)
  }
}

export async function ChatServer({ viewType, id }: ChatServerProps) {
  const user = await requireAuth({ throwOnMissingProfile: true })

  // Fetch all required data in parallel
  const [channels, allUsers, currentView, messages, currentUser] = await Promise.all([
    getChannels(),
    getUsers(),
    fetchViewData(viewType, id),
    fetchMessages(viewType, id),
    fetchCurrentUser(user.id)
  ])

  // Format messages with complete data
  const formattedMessages = messages.map(msg => formatMessage(msg, user.id))

  return (
    <ChatClient
      initialView={{
        type: viewType,
        data: currentView
      }}
      currentUser={currentUser}
      channels={channels}
      users={allUsers}
      initialMessages={formattedMessages}
    />
  )
} 
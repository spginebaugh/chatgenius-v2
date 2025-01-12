import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { ChatClient } from "@/components/chat"
import { Channel, DirectMessage, User, ChannelMessage, ThreadMessage, EmojiReaction } from "@/types/database"
import { requireAuth } from '@/lib/utils/auth'
import { selectRecords } from '@/lib/utils/supabase-helpers'
import { formatMessageForDisplay, formatReactions } from '@/lib/utils/message-helpers'

interface ChatServerProps {
  viewType: "channel" | "dm"
  id: string
}

interface SimpleUser {
  id: string
  username: string
}

interface DisplayMessage {
  id: string
  message: string
  inserted_at: string
  profiles: SimpleUser
  thread_messages?: DisplayMessage[]
  reactions?: Array<{
    emoji: string
    count: number
    reacted_by_me: boolean
  }>
  message_id?: string
}

interface ReactionResponse {
  reaction_id: string
  emoji: string
  user_id: string
  parent_id: string
  parent_type: 'channel_message' | 'direct_message' | 'thread_message'
  inserted_at: string
}

interface ChannelReactionResponse extends ReactionResponse {
  channel_messages: { message_id: number }[]
}

interface DirectReactionResponse extends ReactionResponse {
  direct_messages: { message_id: number }[]
}

interface ThreadReactionResponse extends ReactionResponse {
  thread_messages: { message_id: number }[]
}

export async function ChatServer({ viewType, id }: ChatServerProps) {
  const supabase = await createClient()
  const user = await requireAuth({ throwOnMissingProfile: true })
  
  // Run remaining independent queries in parallel
  const [channels, allUsers, currentViewData, messages] = await Promise.all([
    selectRecords<Channel>({
      table: "channels",
      select: "channel_id, slug, created_by, inserted_at"
    }),
    selectRecords<User>({
      table: "users",
      select: "id, username, bio, profile_picture_url, last_active_at, status, inserted_at"
    }),
    // For single records, use Supabase directly
    supabase
      .from(viewType === "channel" ? "channels" : "users")
      .select("*")
      .eq(viewType === "channel" ? "channel_id" : "id", id)
      .single(),
    viewType === "channel"
      ? supabase
          .from("channel_messages")
          .select("message_id, message, user_id, channel_id, inserted_at")
          .eq("channel_id", id)
          .order("inserted_at", { ascending: true })
      : supabase
          .from("direct_messages")
          .select("message_id, message, sender_id, receiver_id, inserted_at")
          .or(
            `and(sender_id.eq.${user.id},receiver_id.eq.${id}),` +
            `and(sender_id.eq.${id},receiver_id.eq.${user.id})`
          )
          .order("inserted_at", { ascending: true })
  ])

  const currentView = currentViewData.data
  if (!currentView) {
    console.log('[ChatServer] No current view data, redirecting to home')
    redirect("/")
  }

  // Get current user data
  const { data: currentUserData } = await supabase
    .from("users")
    .select("id, username, bio, profile_picture_url, last_active_at, status, inserted_at")
    .eq("id", user.id)
    .single()

  if (!currentUserData) {
    redirect("/sign-in")
  }

  // Get users for messages
  const userIds = viewType === "channel"
    ? Array.from(new Set((messages.data as ChannelMessage[])?.map(m => m.user_id) || []))
    : Array.from(new Set((messages.data as DirectMessage[])?.flatMap(m => [m.sender_id, m.receiver_id]) || []))

  const { data: messageUsers } = await supabase
    .from("users")
    .select("id, username")
    .in("id", userIds)

  const userMap = new Map((messageUsers || []).map(u => [u.id, u]))

  // Fetch thread messages
  const messageIds = messages.data?.map(m => m.message_id) || []
  const { data: threadMessages } = await supabase
    .from("thread_messages")
    .select(`
      message_id,
      message,
      user_id,
      parent_id,
      parent_type,
      inserted_at,
      users (
        id,
        username
      )
    `)
    .in("parent_id", messageIds)
    .eq("parent_type", viewType === "channel" ? "channel_message" : "direct_message")
    .order("inserted_at", { ascending: true })

  // Fetch reactions for main messages and thread messages
  const [mainReactions, threadReactions] = await Promise.all([
    supabase
      .from("emoji_reactions")
      .select(`
        reaction_id,
        emoji,
        user_id,
        parent_id,
        parent_type,
        inserted_at,
        ${viewType === "channel" ? "channel_messages!inner" : "direct_messages!inner"}(message_id)
      `)
      .in("parent_id", messageIds)
      .eq("parent_type", viewType === "channel" ? "channel_message" : "direct_message")
      .filter('parent_type', 'eq', viewType === "channel" ? "channel_message" : "direct_message"),
    threadMessages?.length 
      ? supabase
          .from("emoji_reactions")
          .select(`
            reaction_id,
            emoji,
            user_id,
            parent_id,
            parent_type,
            inserted_at,
            thread_messages!inner(message_id)
          `)
          .in("parent_id", threadMessages.map(tm => tm.message_id))
          .eq("parent_type", "thread_message")
          .filter('parent_type', 'eq', 'thread_message')
      : Promise.resolve({ data: [], error: null })
  ])

  // Group reactions by parent_id and parent_type for efficient lookup
  const reactionsByParent = new Map<string, Map<string, ReactionResponse[]>>()
  
  // Helper to add reactions to the grouped map
  const addReactionsToGroup = (reactions: any[] | null) => {
    if (!reactions) return
    reactions.forEach(r => {
      // Skip if the joined message check failed or parent type doesn't match
      const joinedMessage = r.channel_messages?.[0] || r.direct_messages?.[0] || r.thread_messages?.[0]
      if (!joinedMessage || 
          joinedMessage.message_id !== parseInt(r.parent_id) || 
          (r.parent_type !== 'thread_message' && r.parent_type !== (viewType === "channel" ? "channel_message" : "direct_message"))) {
        return
      }

      const key = `${r.parent_type}:${r.parent_id}`
      if (!reactionsByParent.has(key)) {
        reactionsByParent.set(key, new Map())
      }
      const parentGroup = reactionsByParent.get(key)!
      if (!parentGroup.has(r.emoji)) {
        parentGroup.set(r.emoji, [])
      }
      parentGroup.get(r.emoji)!.push({
        reaction_id: r.reaction_id,
        emoji: r.emoji,
        user_id: r.user_id,
        parent_id: r.parent_id,
        parent_type: r.parent_type,
        inserted_at: r.inserted_at
      })
    })
  }

  // Add reactions to grouped map
  addReactionsToGroup(mainReactions.data)
  addReactionsToGroup(threadReactions.data)

  // Helper to get reactions for a specific message
  const getReactionsForMessage = (messageId: string, parentType: 'channel_message' | 'direct_message' | 'thread_message') => {
    const key = `${parentType}:${messageId}`
    const parentGroup = reactionsByParent.get(key)
    if (!parentGroup) return []
    return Array.from(parentGroup.values()).flat().filter(r => r.parent_type === parentType)
  }

  // Group thread messages by parent and include reactions
  const threadMessagesByParent = new Map<string, DisplayMessage[]>()
  threadMessages?.forEach(tm => {
    const key = tm.parent_id.toString()
    if (!threadMessagesByParent.has(key)) {
      threadMessagesByParent.set(key, [])
    }
    const userProfile = userMap.get(tm.user_id)
    const baseMessage = formatMessageForDisplay({ message: tm })
    const threadReactions = formatReactions({
      reactions: getReactionsForMessage(tm.message_id.toString(), 'thread_message'),
      currentUserId: user.id,
      expectedParentType: 'thread_message'
    })
    threadMessagesByParent.get(key)?.push({
      ...baseMessage,
      profiles: userProfile || { id: tm.user_id, username: "Unknown User" },
      reactions: threadReactions
    })
  })

  const formattedMessages: DisplayMessage[] = (messages.data || []).map(msg => {
    if (viewType === "channel") {
      const m = msg as ChannelMessage
      const baseMessage = formatMessageForDisplay({ message: m })
      const messageReactions = formatReactions({
        reactions: getReactionsForMessage(m.message_id.toString(), 'channel_message'),
        currentUserId: user.id,
        expectedParentType: 'channel_message'
      })
      
      return {
        ...baseMessage,
        message_id: m.message_id.toString(),
        profiles: userMap.get(m.user_id) || { id: m.user_id, username: "Unknown User" },
        thread_messages: threadMessagesByParent.get(m.message_id.toString())?.map(tm => {
          const threadReactions = formatReactions({
            reactions: getReactionsForMessage((tm.message_id || tm.id).toString(), 'thread_message'),
            currentUserId: user.id,
            expectedParentType: 'thread_message'
          })
          return {
            ...tm,
            message: tm.message || "",
            reactions: threadReactions
          }
        }),
        reactions: messageReactions
      }
    } else {
      const m = msg as DirectMessage
      const baseMessage = formatMessageForDisplay({ message: m })
      const messageReactions = formatReactions({
        reactions: getReactionsForMessage(m.message_id.toString(), 'direct_message'),
        currentUserId: user.id,
        expectedParentType: 'direct_message'
      })
      
      return {
        ...baseMessage,
        message_id: m.message_id.toString(),
        profiles: userMap.get(m.sender_id) || { id: m.sender_id, username: "Unknown User" },
        thread_messages: threadMessagesByParent.get(m.message_id.toString())?.map(tm => {
          const threadReactions = formatReactions({
            reactions: getReactionsForMessage((tm.message_id || tm.id).toString(), 'thread_message'),
            currentUserId: user.id,
            expectedParentType: 'thread_message'
          })
          return {
            ...tm,
            message: tm.message || "",
            reactions: threadReactions
          }
        }),
        reactions: messageReactions
      }
    }
  })

  return (
    <ChatClient
      channels={channels}
      users={allUsers}
      initialMessages={formattedMessages}
      initialView={{
        type: viewType,
        data: currentView
      }}
      currentUser={currentUserData}
    />
  )
} 
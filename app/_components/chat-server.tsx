import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { ChatClient } from "@/components/chat"
import { Channel, DirectMessage, User, ChannelMessage } from "@/types/database"

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
}

export async function ChatServer({ viewType, id }: ChatServerProps) {
  const supabase = await createClient()
  
  // First get auth user
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    console.log('[ChatServer] No auth user, redirecting to sign-in')
    redirect("/sign-in")
  }

  // Then run remaining independent queries in parallel
  const [
    channelsResponse,
    usersResponse,
    currentViewResponse,
    messagesResponse
  ] = await Promise.all([
    supabase.from("channels").select("channel_id, slug, created_by, inserted_at"),
    supabase.from("users").select("id, username, bio, profile_picture_url, last_active_at, status, inserted_at"),
    supabase.from(viewType === "channel" ? "channels" : "users")
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
            `and(sender_id.eq.${authUser.id},receiver_id.eq.${id}),` +
            `and(sender_id.eq.${id},receiver_id.eq.${authUser.id})`
          )
          .order("inserted_at", { ascending: true })
  ])

  const { data: channels } = channelsResponse
  const { data: allUsers } = usersResponse
  const { data: currentViewData, error: viewError } = currentViewResponse
  const { data: messages, error: messagesError } = messagesResponse

  console.log('[ChatServer] Current view data fetch:', { 
    hasData: !!currentViewData, 
    error: viewError?.message 
  })

  if (!currentViewData) {
    console.log('[ChatServer] No current view data, redirecting to home')
    redirect("/")
  }

  // Get user data
  const { data: currentUser } = await supabase
    .from("users")
    .select("id, username, bio, profile_picture_url, last_active_at, status, inserted_at")
    .eq("id", authUser.id)
    .single()

  if (!currentUser) {
    redirect("/sign-in")
  }

  // Fetch users
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, username, bio, profile_picture_url, last_active_at, status, inserted_at")
    .order("username", { ascending: true })
  console.log('[ChatServer] Users fetch:', { 
    count: users?.length, 
    error: usersError?.message 
  })

  // Get user info for messages
  const userIds = viewType === "channel"
    ? Array.from(new Set((messages as ChannelMessage[])?.map(m => m.user_id) || []))
    : Array.from(new Set((messages as DirectMessage[])?.flatMap(m => [m.sender_id, m.receiver_id]) || []))

  const { data: messageUsers } = await supabase
    .from("users")
    .select("id, username")
    .in("id", userIds)

  const userMap = new Map((messageUsers || []).map(u => [u.id, u]))

  // Fetch thread messages for all messages
  const messageIds = messages?.map(m => m.message_id) || []
  const { data: threadMessages, error: threadError } = await supabase
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

  if (threadError) {
    console.error('[ChatServer] Error fetching thread messages:', threadError)
  }

  // Split the query into two separate queries for clarity
  const mainMessageQuery = `parent_id.in.(${messageIds.join(',')},parent_type.eq.${viewType === "channel" ? "'channel_message'" : "'direct_message'"})`;
  const threadMessageQuery = `parent_id.in.(${threadMessages?.map(tm => tm.message_id).join(',') || '-1'},parent_type.eq.'thread_message'`;

  // Fetch reactions for main messages
  const mainReactionsPromise = supabase
    .from("emoji_reactions")
    .select(`
      reaction_id,
      emoji,
      user_id,
      parent_id,
      parent_type
    `)
    .in('parent_id', messageIds)
    .eq('parent_type', viewType === "channel" ? "channel_message" : "direct_message");

  // Fetch reactions for thread messages
  const threadReactionsPromise = threadMessages?.length 
    ? supabase
        .from("emoji_reactions")
        .select(`
          reaction_id,
          emoji,
          user_id,
          parent_id,
          parent_type
        `)
        .in('parent_id', threadMessages.map(tm => tm.message_id))
        .eq('parent_type', 'thread_message')
    : Promise.resolve({ data: [], error: null });

  // Combine results
  const [mainReactions, threadReactions] = await Promise.all([
    mainReactionsPromise,
    threadReactionsPromise
  ]);

  const reactions = [
    ...(mainReactions.data || []),
    ...(threadReactions.data || [])
  ];

  if (mainReactions.error) {
    console.error('[ChatServer] Error fetching main reactions:', mainReactions.error);
  }

  if (threadReactions.error) {
    console.error('[ChatServer] Error fetching thread reactions:', threadReactions.error);
  }

  // Group reactions by parent message, parent type, and emoji
  const reactionsByMessage = new Map<string, Map<string, Set<string>>>()
  reactions?.forEach(reaction => {
    // Create a composite key using both parent_id and parent_type
    const compositeKey = `${reaction.parent_id}:${reaction.parent_type}`
    if (!reactionsByMessage.has(compositeKey)) {
      reactionsByMessage.set(compositeKey, new Map())
    }
    const messageReactions = reactionsByMessage.get(compositeKey)!
    if (!messageReactions.has(reaction.emoji)) {
      messageReactions.set(reaction.emoji, new Set())
    }
    messageReactions.get(reaction.emoji)!.add(reaction.user_id)
  })

  // Helper function to format reactions
  const formatReactions = (messageId: string, parentType: 'channel_message' | 'direct_message' | 'thread_message') => {
    const compositeKey = `${messageId}:${parentType}`
    const messageReactions = reactionsByMessage.get(compositeKey)
    return messageReactions ? Array.from(messageReactions.entries()).map(([emoji, users]) => ({
      emoji,
      count: users.size,
      reacted_by_me: users.has(authUser.id)
    })) : []
  }

  // Group thread messages by parent and include reactions
  const threadMessagesByParent = new Map<string, DisplayMessage[]>()
  threadMessages?.forEach(tm => {
    const key = tm.parent_id.toString()
    if (!threadMessagesByParent.has(key)) {
      threadMessagesByParent.set(key, [])
    }
    const userProfile = userMap.get(tm.user_id)
    threadMessagesByParent.get(key)?.push({
      id: tm.message_id.toString(),
      message: tm.message || "",
      inserted_at: tm.inserted_at,
      profiles: userProfile || { id: tm.user_id, username: "Unknown User" },
      reactions: formatReactions(tm.message_id.toString(), 'thread_message')
    })
  })

  const formattedMessages: DisplayMessage[] = (messages || []).map(msg => {
    if (viewType === "channel") {
      const m = msg as ChannelMessage
      return {
        id: m.message_id.toString(),
        message: m.message || "",
        inserted_at: m.inserted_at,
        profiles: userMap.get(m.user_id) || { id: m.user_id, username: "Unknown User" },
        thread_messages: threadMessagesByParent.get(m.message_id.toString())?.map(tm => ({
          ...tm,
          message: tm.message || ""
        })),
        reactions: formatReactions(m.message_id.toString(), 'channel_message')
      }
    } else {
      const m = msg as DirectMessage
      return {
        id: m.message_id.toString(),
        message: m.message || "",
        inserted_at: m.inserted_at,
        profiles: userMap.get(m.sender_id) || { id: m.sender_id, username: "Unknown User" },
        thread_messages: threadMessagesByParent.get(m.message_id.toString())?.map(tm => ({
          ...tm,
          message: tm.message || ""
        })),
        reactions: formatReactions(m.message_id.toString(), 'direct_message')
      }
    }
  })

  return (
    <ChatClient
      channels={channels || []}
      users={users || []}
      messages={formattedMessages}
      currentView={{
        type: viewType,
        data: currentViewData as Channel | User
      }}
      currentUser={currentUser}
    />
  )
} 
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { ChatClient } from "@/components/chat"
import { Channel, DirectMessage, Message, ThreadMessage, User } from "@/types/database"

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
    supabase.from("channels").select("id, slug, created_by, inserted_at"),
    supabase.from("users").select("id, username"),
    supabase.from(viewType === "channel" ? "channels" : "users")
      .select("*")
      .eq("id", id)
      .single(),
    viewType === "channel"
      ? supabase
          .from("messages")
          .select("id, message, user_id, channel_id, inserted_at")
          .eq("channel_id", id)
          .order("inserted_at", { ascending: true })
      : supabase
          .from("direct_messages")
          .select("id, message, sender_id, receiver_id, inserted_at")
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
    .select("id, username")
    .eq("id", authUser.id)
    .single()

  if (!currentUser) {
    redirect("/sign-in")
  }

  // Fetch users
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, username")
    .order("username", { ascending: true })
  console.log('[ChatServer] Users fetch:', { 
    count: users?.length, 
    error: usersError?.message 
  })

  // Get user info for messages
  const userIds = viewType === "channel"
    ? Array.from(new Set((messages as Message[])?.map(m => m.user_id) || []))
    : Array.from(new Set((messages as DirectMessage[])?.flatMap(m => [m.sender_id, m.receiver_id]) || []))

  const { data: messageUsers } = await supabase
    .from("users")
    .select("id, username")
    .in("id", userIds)

  const userMap = new Map((messageUsers || []).map(u => [u.id, u]))

  // Fetch thread messages for all messages
  const messageIds = messages?.map(m => m.id) || []
  const { data: threadMessages, error: threadError } = await supabase
    .from("thread_messages")
    .select(`
      id,
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
    .eq("parent_type", viewType === "channel" ? "channel" : "direct")
    .order("inserted_at", { ascending: true })

  if (threadError) {
    console.error('[ChatServer] Error fetching thread messages:', threadError)
  }

  // Group thread messages by parent
  const threadMessagesByParent = new Map<string, DisplayMessage[]>()
  threadMessages?.forEach(tm => {
    const key = tm.parent_id.toString()
    if (!threadMessagesByParent.has(key)) {
      threadMessagesByParent.set(key, [])
    }
    const userProfile = userMap.get(tm.user_id)
    threadMessagesByParent.get(key)?.push({
      id: tm.id.toString(),
      message: tm.message,
      inserted_at: tm.inserted_at,
      profiles: userProfile || { id: tm.user_id, username: "Unknown User" }
    })
  })

  const formattedMessages: DisplayMessage[] = (messages || []).map(msg => {
    if (viewType === "channel") {
      const m = msg as Message
      return {
        id: m.id.toString(),
        message: m.message,
        inserted_at: m.inserted_at,
        profiles: userMap.get(m.user_id) || { id: m.user_id, username: "Unknown User" },
        thread_messages: threadMessagesByParent.get(m.id.toString())
      }
    } else {
      const m = msg as DirectMessage
      return {
        id: m.id.toString(),
        message: m.message,
        inserted_at: m.inserted_at,
        profiles: userMap.get(m.sender_id) || { id: m.sender_id, username: "Unknown User" },
        thread_messages: threadMessagesByParent.get(m.id.toString())
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
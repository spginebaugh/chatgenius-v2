import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { ChatClient } from "@/components/chat"
import { Channel, DirectMessage, Message, User } from "@/types/database"

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
}

export async function ChatServer({ viewType, id }: ChatServerProps) {
  console.log('[ChatServer] Starting with viewType:', viewType, 'id:', id)
  const supabase = await createClient()
  
  // Check auth
  const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
  console.log('[ChatServer] Auth check:', { user: !!authUser, error: userError?.message })

  if (!authUser || userError) {
    redirect("/sign-in")
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

  // Fetch channels
  const { data: channels, error: channelsError } = await supabase
    .from("channels")
    .select("id, slug, created_by, inserted_at")
    .order("inserted_at", { ascending: true })
  console.log('[ChatServer] Channels fetch:', { 
    count: channels?.length, 
    error: channelsError?.message 
  })

  // Fetch users
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, username")
    .order("username", { ascending: true })
  console.log('[ChatServer] Users fetch:', { 
    count: users?.length, 
    error: usersError?.message 
  })

  // Fetch current view data (channel or user)
  const { data: currentViewData, error: viewError } = viewType === "channel"
    ? await supabase
        .from("channels")
        .select("id, slug, created_by, inserted_at")
        .eq("id", id)
        .single()
    : await supabase
        .from("users")
        .select("id, username")
        .eq("id", id)
        .single()
  console.log('[ChatServer] Current view data fetch:', { 
    hasData: !!currentViewData, 
    error: viewError?.message 
  })

  if (!currentViewData) {
    console.log('[ChatServer] No current view data, redirecting to home')
    redirect("/")
  }

  // Fetch messages
  const { data: messages, error: messagesError } = viewType === "channel"
    ? await supabase
        .from("messages")
        .select("id, message, user_id, channel_id, inserted_at")
        .eq("channel_id", id)
        .order("inserted_at", { ascending: true })
    : await supabase
        .from("direct_messages")
        .select("id, message, sender_id, receiver_id, inserted_at")
        .or(
          `and(sender_id.eq.${authUser.id},receiver_id.eq.${id}),` +
          `and(sender_id.eq.${id},receiver_id.eq.${authUser.id})`
        )
        .order("inserted_at", { ascending: true })
  console.log('[ChatServer] Messages fetch:', { 
    count: messages?.length, 
    error: messagesError?.message 
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

  const formattedMessages: DisplayMessage[] = (messages || []).map(msg => {
    if (viewType === "channel") {
      const m = msg as Message
      return {
        id: m.id.toString(),
        message: m.message,
        inserted_at: m.inserted_at,
        profiles: userMap.get(m.user_id) || { id: m.user_id, username: "Unknown User" }
      }
    } else {
      const m = msg as DirectMessage
      return {
        id: m.id.toString(),
        message: m.message,
        inserted_at: m.inserted_at,
        profiles: userMap.get(m.sender_id) || { id: m.sender_id, username: "Unknown User" }
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
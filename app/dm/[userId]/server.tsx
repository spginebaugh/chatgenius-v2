import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export async function fetchDirectMessageData(params: { userId: string }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/sign-in")
  }

  // Get all users
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('username', { ascending: true })

  // Get all channels (needed for sidebar)
  const { data: channels } = await supabase
    .from('channels')
    .select('*')
    .order('inserted_at', { ascending: true })

  // Get the other user's profile
  const { data: otherUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', params.userId)
    .single()

  // Get direct messages
  let messagesQuery = supabase
    .from('direct_messages')
    .select(`
      id,
      message,
      inserted_at,
      sender_id,
      receiver_id,
      profiles:sender_id (
        username
      )
    `)
    .order('inserted_at', { ascending: true })

  // If it's a self-message (user messaging themselves)
  if (user.id === params.userId) {
    messagesQuery = messagesQuery
      .eq('sender_id', user.id)
      .eq('receiver_id', user.id)
  } else {
    // For messages between two different users
    messagesQuery = messagesQuery
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${params.userId}),and(sender_id.eq.${params.userId},receiver_id.eq.${user.id})`)
  }

  const { data: messages } = await messagesQuery

  return { channels, otherUser, messages, users: users || [] }
} 
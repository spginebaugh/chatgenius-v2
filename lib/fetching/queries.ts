import { createClient } from "@/utils/supabase/server"
import { Channel, User, ChannelMessage, DirectMessage, ThreadMessage } from "@/types/database"

// Channels
export async function getChannels() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("channels")
    .select("channel_id, slug, created_by, inserted_at")
    .order("inserted_at", { ascending: true })

  if (error) throw error
  return data as Channel[]
}

// Users
export async function getUsers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("users")
    .select("id, username, bio, profile_picture_url, last_active_at, status, inserted_at")
    .order("username", { ascending: true })

  if (error) throw error
  return data as User[]
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  
  if (!authUser) return null

  const { data, error } = await supabase
    .from("users")
    .select("id, username, bio, profile_picture_url, last_active_at, status, inserted_at")
    .eq("id", authUser.id)
    .single()

  if (error) throw error
  return data as User
}

// Messages
export async function getChannelMessages(channelId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("channel_messages")
    .select(`
      message_id,
      message,
      user_id,
      channel_id,
      inserted_at,
      users (
        id,
        username
      )
    `)
    .eq("channel_id", channelId)
    .order("inserted_at", { ascending: true })

  if (error) throw error
  return data as ChannelMessage[]
}

export async function getDirectMessages(userId: string, otherUserId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("direct_messages")
    .select(`
      message_id,
      message,
      sender_id,
      receiver_id,
      inserted_at,
      users!sender_id (
        id,
        username
      )
    `)
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),` +
      `and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
    )
    .order("inserted_at", { ascending: true })

  if (error) throw error
  return data as DirectMessage[]
}

// Thread Messages
export async function getThreadMessages(parentId: string, parentType: 'channel_message' | 'direct_message') {
  const supabase = await createClient()
  const { data, error } = await supabase
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
    .eq("parent_id", parentId)
    .eq("parent_type", parentType)
    .order("inserted_at", { ascending: true })

  if (error) throw error
  return data as ThreadMessage[]
}

// Reactions
export async function getReactions(messageId: string, messageType: 'channel_message' | 'direct_message' | 'thread_message') {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("emoji_reactions")
    .select(`
      reaction_id,
      emoji,
      user_id,
      parent_id,
      parent_type
    `)
    .eq("parent_id", messageId)
    .eq("parent_type", messageType)

  if (error) throw error
  return data
} 
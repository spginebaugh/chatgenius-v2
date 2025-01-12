import { createClient } from '@/utils/supabase/server'
import { Channel, User, ChannelMessage, DirectMessage, ThreadMessage } from '@/types/database'

// Fetch all channels
export async function getChannels(): Promise<Channel[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .order('inserted_at', { ascending: true })

  if (error) throw error
  return data
}

// Fetch all users
export async function getUsers(): Promise<User[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('username', { ascending: true })

  if (error) throw error
  return data
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}

// Get channel messages
export async function getChannelMessages(channelId: string): Promise<ChannelMessage[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('channel_messages')
    .select('*, users(*)')
    .eq('channel_id', channelId)
    .order('inserted_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data
}

// Get direct messages between users
export async function getDirectMessages(userId: string, otherUserId: string): Promise<DirectMessage[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('direct_messages')
    .select('*, users!sender_id(*)')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .order('inserted_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data
}

// Get thread messages
export async function getThreadMessages(parentId: string, parentType: 'channel_message' | 'direct_message'): Promise<ThreadMessage[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('thread_messages')
    .select('*, users(*)')
    .eq('parent_id', parentId)
    .eq('parent_type', parentType)
    .order('inserted_at', { ascending: true })

  if (error) throw error
  return data
}

// Get reactions for a message
export async function getReactions(messageId: string, messageType: 'channel_message' | 'direct_message' | 'thread_message'): Promise<any[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reactions')
    .select('*, users(*)')
    .eq('parent_id', messageId)
    .eq('parent_type', messageType)
    .order('inserted_at', { ascending: true })

  if (error) throw error
  return data
} 
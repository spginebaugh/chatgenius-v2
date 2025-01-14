import { createClient } from '@/app/_lib/supabase-server'
import type { DbMessage, MessageFile } from '@/types/database'

// Send a new message
export async function sendMessage(message: Partial<DbMessage>): Promise<DbMessage> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select(`
      *,
      user:users(*),
      reactions:message_reactions(*),
      files:message_files(*),
      mentions:message_mentions(*)
    `)
    .single()

  if (error) throw error
  return data
}

// Toggle a reaction on a message
export async function toggleReaction(messageId: number, emoji: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase
    .rpc('toggle_reaction', {
      p_message_id: messageId,
      p_emoji: emoji,
      p_user_id: user.id
    })

  if (error) throw error
}

// Add file to message
export async function addFileToMessage(messageId: number, fileUrl: string, fileType: 'image' | 'video' | 'audio' | 'document'): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('message_files')
    .insert({
      message_id: messageId,
      file_url: fileUrl,
      file_type: fileType
    })

  if (error) throw error
}

// Add mention to message
export async function addMentionToMessage(messageId: number, mentionedUserId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('message_mentions')
    .insert({
      message_id: messageId,
      mentioned_user_id: mentionedUserId
    })

  if (error) throw error
} 
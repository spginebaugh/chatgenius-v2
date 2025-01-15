import { createClient } from '@/app/_lib/supabase-server'
import type { MessageReaction } from '@/types/database'

export async function getMessageReactions(messageId: number): Promise<MessageReaction[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('message_reactions')
    .select('*, user:users(*)')
    .eq('message_id', messageId)
    .order('inserted_at', { ascending: true })

  if (error) throw error
  return data || []
} 
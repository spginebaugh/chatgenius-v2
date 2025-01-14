import { createClient } from './supabase-server'
import type { Channel } from '@/types/database'

// Fetch all channels
export async function getChannels(): Promise<Channel[]> {
  const supabase = await createClient()
  const { data: channels, error } = await supabase
    .from('channels')
    .select('*')
    .order('inserted_at', { ascending: true })

  if (error) {
    console.error('Error fetching channels:', error)
    return []
  }

  return channels
} 
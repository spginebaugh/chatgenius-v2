import { selectRecords } from '@/app/_lib/supabase'
import type { Channel } from '../types/auth'

export async function getDefaultChannelId(): Promise<number> {
  try {
    const channels = await selectRecords<Channel>({
      table: 'channels',
      select: 'id',
      options: {
        errorMap: {
          NOT_FOUND: { message: 'No channels found', status: 404 }
        }
      }
    })
    return channels?.[0]?.id || 1
  } catch (error) {
    console.error('Error fetching default channel:', error)
    return 1 // Fallback to channel 1
  }
} 
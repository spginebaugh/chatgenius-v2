'use server'

import { requireAuth } from '@/app/_lib/auth'
import { createClient } from '@/app/_lib/supabase-server'
import type { AddReactionProps } from './types'

export async function addEmojiReaction({
  messageId,
  emoji
}: AddReactionProps) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    console.log('Attempting to toggle reaction with params:', {
      p_message_id: messageId,
      p_emoji: emoji,
      p_user_id: user.id
    })

    // Use RPC for the toggle operation
    const { data, error } = await supabase.rpc('toggle_reaction', {
      p_message_id: messageId,
      p_emoji: emoji,
      p_user_id: user.id
    })

    console.log('Toggle reaction response:', { data, error })

    if (error) {
      throw new Error(`Failed to toggle reaction: ${error.message}`)
    }
  } catch (error) {
    console.error('Error in addEmojiReaction:', error)
    throw error
  }
} 
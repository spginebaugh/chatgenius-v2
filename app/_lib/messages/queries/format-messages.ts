import { createClient } from '@/app/_lib/supabase-server'
import type { MessageReaction } from '@/types/database'
import type { UiMessage, UiMessageReaction } from '@/types/messages-ui'
import type { MessageWithJoins } from './types'

// Reaction Formatting
export function groupReactionsByEmoji(reactions: MessageReaction[]): Map<string, Set<string>> {
  const reactionsByEmoji = new Map<string, Set<string>>()
  
  if (!reactions?.length) return reactionsByEmoji

  reactions.forEach(reaction => {
    if (!reactionsByEmoji.has(reaction.emoji)) {
      reactionsByEmoji.set(reaction.emoji, new Set())
    }
    reactionsByEmoji.get(reaction.emoji)!.add(reaction.user_id)
  })

  return reactionsByEmoji
}

export function formatReactions(reactions: MessageReaction[], currentUserId?: string): UiMessageReaction[] {
  if (!reactions?.length) return []
  
  const reactionsByEmoji = groupReactionsByEmoji(reactions)

  return Array.from(reactionsByEmoji.entries()).map(([emoji, users]) => ({
    emoji,
    count: users.size,
    reacted_by_me: currentUserId ? users.has(currentUserId) : false
  }))
}

/**
 * Formats a database message with joins into a UI-friendly format.
 * Handles null values and provides defaults for UI rendering.
 */
export async function formatMessageForDisplay(message: MessageWithJoins, currentUserId?: string): Promise<UiMessage> {
  const supabase = await createClient()

  return {
    id: message.id,
    message: message.message || '', // Convert null to empty string
    message_type: message.message_type,
    user_id: message.user_id,
    channel_id: message.channel_id,
    receiver_id: message.receiver_id,
    parent_message_id: message.parent_message_id,
    thread_count: message.thread_count,
    inserted_at: message.inserted_at,
    // Format profile with defaults
    profiles: {
      id: message.profiles?.id || message.user_id,
      username: message.profiles?.username || 'Unknown',
      profile_picture_url: message.profiles?.profile_picture_url || null,
      status: message.profiles?.status || 'OFFLINE'
    },
    // Convert null arrays to empty arrays
    reactions: formatReactions(message.reactions || [], currentUserId),
    files: (message.files || []).map(file => ({
      url: file.file_url,  // Use the stored URL directly
      type: file.file_type,
      name: file.file_url.split('/').pop() || 'file'
    })),
    thread_messages: [] // Initialize empty thread messages array
  }
} 
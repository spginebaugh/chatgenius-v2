import type { DbMessage, MessageReaction } from '@/types/database'
import type { UiMessage } from '@/types/messages-ui'

export interface FormattedReaction {
  emoji: string
  count: number
  reacted_by_me: boolean
}

export interface FormatMessageParams {
  message: DbMessage & {
    reactions?: MessageReaction[]
    user?: { id: string; username: string }
  }
  currentUserId: string
}

export function formatReactions(reactions: MessageReaction[] = [], currentUserId: string): FormattedReaction[] {
  const reactionMap = reactions.reduce((acc: Record<string, FormattedReaction>, r: MessageReaction) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = {
        emoji: r.emoji,
        count: 0,
        reacted_by_me: false
      }
    }
    acc[r.emoji].count++
    if (r.user_id === currentUserId) {
      acc[r.emoji].reacted_by_me = true
    }
    return acc
  }, {})

  return Object.values(reactionMap)
}

export function formatMessage({ message, currentUserId }: FormatMessageParams): UiMessage {
  return {
    ...message,
    message: message.message || '',
    profiles: {
      id: message.user?.id || message.user_id,
      username: message.user?.username || 'Unknown',
      profile_picture_url: null,
      status: 'OFFLINE'
    },
    reactions: formatReactions(message.reactions, currentUserId),
    files: [],
    thread_messages: [],
    thread_count: 0
  }
} 
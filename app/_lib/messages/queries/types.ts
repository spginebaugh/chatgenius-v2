import type { DbMessage, MessageFile, MessageReaction, UserStatus } from '@/types/database'
import type { UiMessage } from '@/types/messages-ui'

/**
 * Intermediate type representing a message with its joined relations from the database.
 * Extends DbMessage with explicitly nullable joined data.
 */
export interface MessageWithJoins extends DbMessage {
  profiles: {
    user_id: string
    username: string | null
    profile_picture_url: string | null
    status: UserStatus | null
  } | null // null when join fails or user deleted
  files: MessageFile[] | null // null when not loaded
  reactions: MessageReaction[] | null // null when not loaded
}

// Type without thread_messages to avoid recursion in certain operations
export type NoThreadMessage = Omit<UiMessage, 'thread_messages'>

// Query Constants
export const BASE_MESSAGE_QUERY = `
  *,
  profiles:users!messages_user_id_fkey(
    user_id,
    username
  ),
  files:message_files(*),
  reactions:message_reactions(*)
`

export const THREAD_MESSAGE_QUERY = `
  *,
  profiles:users!messages_user_id_fkey(
    user_id,
    username
  ),
  files:message_files(*),
  reactions:message_reactions(*),
  mentions:message_mentions(*)
` 
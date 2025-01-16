import { DbMessage, MessageReaction, UserStatus, MessageFile, FileType } from './database'

/**
 * Profile information formatted for UI display.
 * Required fields have non-null defaults, optional fields use null for conditional rendering.
 */
export interface UiProfile {
  user_id: string // Required: from user_id if profile missing
  username: string // Required: defaults to 'Unknown'
  profile_picture_url: string | null // Optional: for conditional rendering of avatar
  status: UserStatus // Required: defaults to 'OFFLINE'
}

/**
 * File attachment formatted for UI display.
 * All fields required as they're transformed from database data.
 */
export interface UiFileAttachment {
  url: string
  type: FileType
  name: string // Derived from url or default
  vector_status?: 'pending' | 'processing' | 'completed' | 'failed' // Optional: for RAG support
}

/**
 * Message reaction formatted for UI display.
 * All fields required as they're aggregated from database data.
 */
export interface UiMessageReaction {
  emoji: string
  count: number
  reacted_by_me: boolean
}

/**
 * Base UI message type without thread messages.
 * Required fields have non-null defaults, preserves nullability for routing-related fields.
 */
export interface BaseUiMessage {
  message_id: number
  message: string // Required: defaults to empty string
  message_type: DbMessage['message_type']
  user_id: string
  channel_id: number | null // Preserved null for routing logic
  receiver_id: string | null // Preserved null for routing logic
  parent_message_id: number | null // Preserved null for threading logic
  thread_count: number
  inserted_at: string
  profiles: UiProfile // Required: always has defaults
  files: UiFileAttachment[] // Required: defaults to empty array
  reactions: UiMessageReaction[] // Required: defaults to empty array
}

/**
 * Complete UI message type with thread messages.
 * Thread messages are optional to support lazy loading.
 */
export interface UiMessage extends BaseUiMessage {
  thread_messages?: UiMessage[] // Optional: for lazy loading
}

/**
 * Props type for message components.
 * Optional handlers for user interactions.
 */
export interface MessageProps {
  message: UiMessage
  onEmojiSelect?: (messageId: number, emoji: string) => Promise<void>
  onThreadClick?: (message: UiMessage) => void
}

/**
 * Chat view data type.
 * Required type with optional display fields.
 */
export interface ChatViewData {
  type: 'channel' | 'dm'
  data: {
    channel_id?: number // For channel type
    user_id?: string // For dm type
    name?: string // Optional: for display
    slug?: string // Optional: for routing
  }
} 
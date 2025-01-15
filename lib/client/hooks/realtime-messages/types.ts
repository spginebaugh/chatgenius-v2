import type { RealtimeChannel } from '@supabase/supabase-js'
import type { DbMessage, MessageReaction } from '@/types/database'

export type MessageType = 'channels' | 'dms' | 'threads'

export interface UseRealtimeMessagesParams {
  channelId?: number
  receiverId?: string
  parentMessageId?: number
  onNewMessage?: (message: DbMessage) => void
  onMessageDelete?: (message: DbMessage) => void
  onMessageUpdate?: (message: DbMessage) => void
  onReactionUpdate?: (messageId: number, reactions: MessageReaction[]) => void
}

export interface MessageReactionPayload {
  id: number
  message_id: number
  user_id: string
  emoji: string
  created_at: string
}

export interface SubscriptionContext {
  messageType: MessageType
  storeKey: string | number
  currentUserId: string
  channelId?: number
  receiverId?: string
  parentMessageId?: number
}

export interface SubscriptionRefs {
  messageRef: React.MutableRefObject<RealtimeChannel | null>
  reactionRef: React.MutableRefObject<RealtimeChannel | null>
  currentUserIdRef: React.MutableRefObject<string | null>
}

export interface MessageCallbacks {
  onNewMessage?: (message: DbMessage) => void
  onMessageDelete?: (message: DbMessage) => void
  onMessageUpdate?: (message: DbMessage) => void
  onReactionUpdate?: (messageId: number, reactions: MessageReaction[]) => void
} 
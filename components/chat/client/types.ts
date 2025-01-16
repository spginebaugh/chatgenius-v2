import type { User, MessageReaction, DbMessage, UserStatus } from '@/types/database'
import type { UiProfile, UiMessage } from '@/types/messages-ui'
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'

export interface ChatClientFetchProps {
  currentUser: Pick<User, 'user_id'>
  currentChannelId?: number
  currentDmUserId?: string
  parentMessageId?: number
  skipInitialFetch?: boolean
  initialMessages?: UiMessage[]
}

export interface QueryConfig {
  messageType: 'channels' | 'dms' | 'threads'
  storeKey: string | number
  query: PostgrestFilterBuilder<any, any, any>
}

export interface RawMessage extends DbMessage {
  profiles: UiProfile | null
  files: any[]
  reactions: MessageReaction[]
  thread_messages: Array<DbMessage & { profiles: UiProfile | null, files: any[] }>
} 
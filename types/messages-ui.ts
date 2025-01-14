import { DbMessage, MessageReaction, UserStatus, MessageFile } from './database'

export interface UiMessageReaction {
  emoji: string
  count: number
  reacted_by_me: boolean
}

export interface UiMessage extends Omit<DbMessage, 'id'> {
  id: number
  profiles: {
    id: string
    username: string
    profile_picture_url?: string | null
    status?: UserStatus
  }
  files?: MessageFile[]
  thread_messages?: UiMessage[]
  reactions?: Array<UiMessageReaction>
} 
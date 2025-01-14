export type MessageType = 'channel' | 'direct' | 'thread'
export type UserStatus = 'ONLINE' | 'OFFLINE'
export type FileType = 'image' | 'video' | 'audio' | 'document'
export type AppRole = 'admin' | 'moderator'
export type AppPermission = 'channels.delete' | 'messages.delete'

export interface User {
  id: string
  username: string | null
  bio: string | null
  profile_picture_url: string | null
  last_active_at: string | null
  status: UserStatus
  inserted_at: string
}

export interface Channel {
  id: number
  slug: string
  created_by: string
  inserted_at: string
}

export interface DbMessage {
  id: number
  message: string | null
  message_type: MessageType
  user_id: string
  channel_id: number | null
  receiver_id: string | null
  parent_message_id: number | null
  thread_count: number
  inserted_at: string
}

export interface MessageFile {
  id: number
  message_id: number
  file_type: FileType
  file_url: string
  inserted_at: string
}

export interface MessageMention {
  id: number
  message_id: number
  mentioned_user_id: string
  inserted_at: string
}

export interface MessageReaction {
  id: number
  message_id: number
  user_id: string
  emoji: string
  inserted_at: string
}

export interface UserRole {
  id: number
  user_id: string
  role: AppRole
  inserted_at: string
}

export interface RolePermission {
  id: number
  role: AppRole
  permission: AppPermission
  inserted_at: string
}
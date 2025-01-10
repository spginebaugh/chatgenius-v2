export interface User {
  id: string
  username: string | null
  bio: string | null
  profile_picture_url: string | null
  last_active_at: string | null
  status: 'ONLINE' | 'OFFLINE'
  inserted_at: string
}

export interface Channel {
  channel_id: number
  slug: string
  created_by: string
  inserted_at: string
}

export interface ChannelMessage {
  message_id: number
  message: string | null
  channel_id: number
  user_id: string
  inserted_at: string
}

export interface DirectMessage {
  message_id: number
  message: string | null
  sender_id: string
  receiver_id: string
  inserted_at: string
}

export interface ThreadMessage {
  message_id: number
  message: string | null
  user_id: string
  parent_id: number
  parent_type: 'channel_message' | 'direct_message'
  inserted_at: string
}

export interface EmojiReaction {
  reaction_id: number
  user_id: string
  parent_id: number
  parent_type: 'channel_message' | 'direct_message' | 'thread_message'
  emoji: string
  inserted_at: string
}

export interface File {
  file_id: number
  user_id: string
  parent_id: number
  parent_type: 'channel_message' | 'direct_message' | 'thread_message'
  file_type: 'image' | 'video' | 'audio' | 'document'
  file_url: string
  inserted_at: string
}

export interface MessageMention {
  mention_id: number
  parent_id: number
  parent_type: 'channel_message' | 'direct_message' | 'thread_message'
  mentioned_user_id: string
  inserted_at: string
}

export interface UserRole {
  role_assignment_id: number
  user_id: string
  role: 'admin' | 'moderator'
  inserted_at: string
}

export interface RolePermission {
  permission_assignment_id: number
  role: 'admin' | 'moderator'
  permission: 'channels.delete' | 'messages.delete'
  inserted_at: string
}
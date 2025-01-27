export type MessageType = 'channel' | 'direct' | 'thread'
export type UserStatus = 'ONLINE' | 'OFFLINE'
export type FileType = 'image' | 'video' | 'audio' | 'document'
export type AppRole = 'admin' | 'moderator'
export type AppPermission = 'channels.delete' | 'messages.delete'

/**
 * Database user type with explicit null for nullable columns.
 */
export interface User {
  user_id: string
  username: string | null
  bio: string | null
  profile_picture_url: string | null
  last_active_at: string | null
  status: UserStatus // Non-null enum with default in DB
  inserted_at: string // Non-null timestamp with default in DB
}

/**
 * Database channel type with non-null columns.
 */
export interface Channel {
  channel_id: number
  slug: string
  created_by: string
  inserted_at: string // Non-null timestamp with default in DB
}

/**
 * Raw database message type representing the messages table structure.
 * Uses explicit null for nullable columns to match database schema.
 */
export interface DbMessage {
  message_id: number
  message: string | null
  message_type: MessageType // Non-null enum
  user_id: string // Non-null foreign key
  channel_id: number | null
  receiver_id: string | null
  parent_message_id: number | null
  thread_count: number // Non-null with default in DB
  inserted_at: string // Non-null timestamp with default in DB
}

/**
 * Database message file type with non-null columns.
 */
export interface MessageFile {
  file_id: number
  message_id: number // Non-null foreign key
  file_type: FileType // Non-null enum
  file_url: string
  vector_status: string // Non-null with default 'pending'
  inserted_at: string // Non-null timestamp with default in DB
}

/**
 * Database message mention type with non-null columns.
 */
export interface MessageMention {
  mention_id: number
  message_id: number // Non-null foreign key
  mentioned_user_id: string // Non-null foreign key
  inserted_at: string // Non-null timestamp with default in DB
}

/**
 * Database message reaction type with non-null columns.
 */
export interface MessageReaction {
  reaction_id: number
  message_id: number // Non-null foreign key
  user_id: string // Non-null foreign key
  emoji: string
  inserted_at: string // Non-null timestamp with default in DB
}

/**
 * Database user role type with non-null columns.
 */
export interface UserRole {
  role_id: number
  user_id: string // Non-null foreign key
  role: AppRole // Non-null enum
  inserted_at: string // Non-null timestamp with default in DB
}

/**
 * Database role permission type with non-null columns.
 */
export interface RolePermission {
  permission_id: number
  role: AppRole // Non-null enum
  permission: AppPermission // Non-null enum
  inserted_at: string // Non-null timestamp with default in DB
}

/**
 * Database vector type for RAG support.
 * All columns are non-null with appropriate defaults where specified.
 */
export interface Vector {
  embedding_id: string // UUID primary key with default uuid_generate_v4()
  file_id: number // Non-null foreign key to message_files
  chunk_index: number // Non-null for ordering
  vector_id: string // Non-null external vector store reference
  chunk_text: string // Non-null content
  created_at: string // Non-null timestamp with default now()
}
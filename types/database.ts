export interface Channel {
  id: string
  slug: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  message: string
  channel_id: string
  user_id: string
  inserted_at: string
  updated_at: string
}

export interface Profile {
  id: string
  username: string
  avatar_url?: string
  created_at: string
  updated_at: string
} 
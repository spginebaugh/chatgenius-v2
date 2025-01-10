export interface Channel {
  id: number
  slug: string
  created_by: string
  inserted_at: string
}

export interface Message {
  id: number
  message: string
  user_id: string
  channel_id: number
  inserted_at: string
  profiles?: Profile
}

export interface Profile {
  id: string
  username: string
  avatar_url: string
  created_at: string
}

export interface DirectMessage {
  id: number
  message: string
  sender_id: string
  receiver_id: string
  inserted_at: string
  profiles?: Profile
}

export interface User {
  id: string
  username: string
}

export interface ThreadMessage {
  id: number
  message: string
  user_id: string
  parent_id: number
  parent_type: 'message' | 'direct_message'
  inserted_at: string
  profiles?: Profile
} 
import type { Channel, User } from "@/types/database"
import type { ChatViewData } from "@/components/chat/shared/types"

interface GetViewKeyAndTypeResult {
  messageType: 'channels' | 'dms'
  key: string
  channelId?: number
  receiverId?: string
}

export function getViewKeyAndType(view: ChatViewData): GetViewKeyAndTypeResult {
  const messageType = view.type === 'channel' ? 'channels' as const : 'dms' as const
  const key = view.type === 'channel' 
    ? `channels:${(view.data as Channel).channel_id.toString()}` // Convert channel ID to string with prefix
    : `dms:${(view.data as User).user_id}` // DM user ID is already a string, add prefix

  return {
    messageType,
    key,
    channelId: view.type === 'channel' ? (view.data as Channel).channel_id : undefined,
    receiverId: view.type === 'dm' ? (view.data as User).user_id : undefined
  }
} 

export function getStoreKey(view: ChatViewData) {
  return view.type === 'channel'
    ? `channels:${(view.data as Channel).channel_id.toString()}` // Convert channel ID to string with prefix
    : `dms:${(view.data as User).user_id}` // DM user ID is already a string, add prefix
}

export function getMessageQueryParams(view: ChatViewData) {
  return {
    channelId: view.type === 'channel' ? (view.data as Channel).channel_id : undefined,
    receiverId: view.type === 'dm' ? (view.data as User).user_id : undefined
  }
} 
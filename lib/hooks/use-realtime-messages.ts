"use client"

import { useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { ReactionType } from "@/types/frontend"
import { User, ChannelMessage, DirectMessage, ThreadMessage, EmojiReaction } from "@/types/database"
import { RealtimeChannel } from "@supabase/supabase-js"
import { subscribeToChannelMessages, subscribeToDirectMessages, subscribeToThreadMessages, subscribeToReactions, unsubscribeAll } from '@/lib/utils/realtime'

interface Message {
  id: string
  message: string
  inserted_at: string
  profiles: {
    id: string
    username: string
  }
  thread_messages?: Array<{
    id: string
    message: string
    inserted_at: string
    profiles: {
      id: string
      username: string
    }
  }>
  reactions?: Array<{
    emoji: string
    count: number
    reacted_by_me: boolean
  }>
  parent_id?: string
  parent_type?: 'channel_message' | 'direct_message'
}

export interface UseRealtimeMessagesProps {
  channelId?: string
  userId?: string
  viewType: 'channel' | 'dm'
  currentViewData?: User
  onNewMessage: (message: {
    id: string
    message: string
    inserted_at: string
    profiles: {
      id: string
      username: string
    }
    thread_messages?: Array<{
      id: string
      message: string
      inserted_at: string
      profiles: {
        id: string
        username: string
      }
    }>
    reactions?: ReactionType[]
  }) => void
  onNewThreadMessage: (parentId: string, message: UseRealtimeMessagesProps['onNewMessage'] extends (message: infer T) => void ? T : never) => void
  onMessageDelete: (messageId: string) => void
  onReactionChange: (messageId: string, reactions: ReactionType[] | undefined, parentType: 'channel_message' | 'direct_message' | 'thread_message') => void
}

interface DatabaseMessage {
  message_id: string
  message: string | null
  inserted_at: string
  channel_id?: string
  user_id?: string
  sender_id?: string
  receiver_id?: string
  parent_id?: number
  parent_type?: 'channel_message' | 'direct_message'
  users: {
    id: string
    username: string
  }
}

export function useRealtimeMessages({
  channelId,
  userId,
  viewType,
  currentViewData,
  onNewMessage,
  onNewThreadMessage,
  onMessageDelete,
  onReactionChange,
}: UseRealtimeMessagesProps) {
  useEffect(() => {
    if (!channelId && !userId) return

    const supabase = createClient()
    const subscriptions: RealtimeChannel[] = []

    // Subscribe to main messages
    if (viewType === 'channel' && channelId) {
      subscriptions.push(
        subscribeToChannelMessages({
          channelId,
          callbacks: {
            onInsert: async (message: ChannelMessage) => {
              const { data: userData } = await supabase
                .from('users')
                .select('id, username')
                .eq('id', message.user_id)
                .single()

              onNewMessage({
                id: message.message_id.toString(),
                message: message.message || '',
                inserted_at: message.inserted_at,
                profiles: {
                  id: userData?.id || message.user_id,
                  username: userData?.username || 'Unknown'
                },
                thread_messages: [],
                reactions: []
              })
            },
            onDelete: (message: ChannelMessage) => {
              onMessageDelete(message.message_id.toString())
            }
          }
        })
      )
    } else if (viewType === 'dm' && userId && currentViewData?.id) {
      subscriptions.push(
        subscribeToDirectMessages({
          userId,
          otherUserId: currentViewData.id,
          callbacks: {
            onInsert: async (message: DirectMessage) => {
              const { data: userData } = await supabase
                .from('users')
                .select('id, username')
                .eq('id', message.sender_id)
                .single()

              onNewMessage({
                id: message.message_id.toString(),
                message: message.message || '',
                inserted_at: message.inserted_at,
                profiles: {
                  id: userData?.id || message.sender_id,
                  username: userData?.username || 'Unknown'
                },
                thread_messages: [],
                reactions: []
              })
            },
            onDelete: (message: DirectMessage) => {
              onMessageDelete(message.message_id.toString())
            }
          }
        })
      )
    }

    // Subscribe to thread messages
    if (viewType === 'channel' && channelId) {
      subscriptions.push(
        subscribeToThreadMessages({
          parentId: channelId,
          parentType: 'channel_message',
          callbacks: {
            onInsert: async (message: ThreadMessage) => {
              const { data: userData } = await supabase
                .from('users')
                .select('id, username')
                .eq('id', message.user_id)
                .single()

              onNewThreadMessage(message.parent_id.toString(), {
                id: message.message_id.toString(),
                message: message.message || '',
                inserted_at: message.inserted_at,
                profiles: {
                  id: userData?.id || message.user_id,
                  username: userData?.username || 'Unknown'
                }
              })
            }
          }
        })
      )
    } else if (viewType === 'dm' && userId) {
      subscriptions.push(
        subscribeToThreadMessages({
          parentId: userId,
          parentType: 'direct_message',
          callbacks: {
            onInsert: async (message: ThreadMessage) => {
              const { data: userData } = await supabase
                .from('users')
                .select('id, username')
                .eq('id', message.user_id)
                .single()

              onNewThreadMessage(message.parent_id.toString(), {
                id: message.message_id.toString(),
                message: message.message || '',
                inserted_at: message.inserted_at,
                profiles: {
                  id: userData?.id || message.user_id,
                  username: userData?.username || 'Unknown'
                }
              })
            }
          }
        })
      )
    }

    // Subscribe to reactions
    if (viewType === 'channel' && channelId) {
      subscriptions.push(
        subscribeToReactions({
          messageId: channelId,
          messageType: 'channel_message',
          callbacks: {
            onInsert: (reaction: EmojiReaction) => {
              onReactionChange(reaction.parent_id.toString(), undefined, reaction.parent_type)
            },
            onDelete: (reaction: EmojiReaction) => {
              onReactionChange(reaction.parent_id.toString(), undefined, reaction.parent_type)
            }
          }
        })
      )
    } else if (viewType === 'dm' && userId) {
      subscriptions.push(
        subscribeToReactions({
          messageId: userId,
          messageType: 'direct_message',
          callbacks: {
            onInsert: (reaction: EmojiReaction) => {
              onReactionChange(reaction.parent_id.toString(), undefined, reaction.parent_type)
            },
            onDelete: (reaction: EmojiReaction) => {
              onReactionChange(reaction.parent_id.toString(), undefined, reaction.parent_type)
            }
          }
        })
      )
    }

    return () => {
      unsubscribeAll({ channels: subscriptions })
    }
  }, [channelId, userId, viewType, currentViewData, onNewMessage, onNewThreadMessage, onMessageDelete, onReactionChange])
} 
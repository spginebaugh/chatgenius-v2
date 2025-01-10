"use client"

import { useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { RealtimeChannel } from "@supabase/supabase-js"

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
}

interface UseRealtimeMessagesProps {
  channelId?: string
  userId?: string
  onNewMessage?: (message: Message) => void
  onNewThreadMessage?: (parentId: string, message: Message) => void
  onMessageDelete?: (messageId: string) => void
}

interface DatabaseMessage {
  id: string
  message: string
  inserted_at: string
  users: {
    id: string
    username: string
  }
}

export function useRealtimeMessages({
  channelId,
  userId,
  onNewMessage,
  onNewThreadMessage,
  onMessageDelete,
}: UseRealtimeMessagesProps) {
  useEffect(() => {
    const supabase = createClient()
    let channelSubscription: RealtimeChannel | null = null
    let dmSubscription: RealtimeChannel | null = null
    let channelThreadSubscription: RealtimeChannel | null = null
    let dmThreadSubscription: RealtimeChannel | null = null

    const fetchMessageWithUser = async (messageId: string, table: string): Promise<Message | null> => {
      console.log(`[fetchMessageWithUser] Fetching message with ID: ${messageId} from table: ${table}`);
      const query = table === 'thread_messages' 
        ? supabase
            .from(table)
            .select(`
              id,
              message,
              inserted_at,
              parent_id,
              parent_type,
              users:user_id (
                id,
                username
              )
            `)
            .eq('id', messageId)
            .single()
        : supabase
            .from(table)
            .select(`
              id,
              message,
              inserted_at,
              users:user_id (
                id,
                username
              )
            `)
            .eq('id', messageId)
            .single()

      const { data } = await query

      if (data) {
        console.log(`[fetchMessageWithUser] Fetched data:`, data);
        const dbMessage = data as unknown as DatabaseMessage
        return {
          id: dbMessage.id,
          message: dbMessage.message,
          inserted_at: dbMessage.inserted_at,
          profiles: dbMessage.users
        }
      }
      console.log(`[fetchMessageWithUser] No data found for message ID: ${messageId}`);
      return null
    }

    const setupSubscriptions = async () => {
      console.log('[setupSubscriptions] Setting up subscriptions');
      // Channel messages subscription
      if (channelId) {
        console.log(`[setupSubscriptions] Subscribing to channel messages for channel ID: ${channelId}`);
        // Subscribe to channel messages
        channelSubscription = supabase
          .channel(`channel-messages-${channelId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "messages",
              filter: `channel_id=eq.${channelId}`,
            },
            async (payload) => {
              console.log('[Channel Subscription] Received payload:', payload);
              if (payload.eventType === "INSERT" && onNewMessage) {
                const message = await fetchMessageWithUser(payload.new.id, 'messages')
                if (message) {
                  onNewMessage(message)
                }
              } else if (payload.eventType === "DELETE" && onMessageDelete) {
                onMessageDelete(payload.old.id)
              }
            }
          )
          .subscribe()

        // Subscribe to thread messages for this channel's messages
        const { data: channelMessages } = await supabase
          .from('messages')
          .select('id')
          .eq('channel_id', channelId)

        if (channelMessages?.length) {
          const messageIds = channelMessages.map(m => m.id)
          console.log(`[setupSubscriptions] Subscribing to thread messages for channel messages with IDs: ${messageIds}`);
          channelThreadSubscription = supabase
            .channel(`thread-messages-channel-${channelId}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "thread_messages",
                filter: `parent_type=eq.'channel' and parent_id=in.(${messageIds.join(',')})`,
              },
              async (payload) => {
                console.log('[Thread Subscription] New channel thread message:', payload.new);
                if (onNewThreadMessage) {
                  const message = await fetchMessageWithUser(payload.new.id, 'thread_messages')
                  if (message) {
                    onNewThreadMessage(
                      payload.new.parent_id.toString(),
                      message
                    )
                  }
                }
              }
            )
            .subscribe()
        } else {
          console.log('[setupSubscriptions] No channel messages found for subscription');
        }
      }

      // Direct messages subscription
      if (userId) {
        console.log(`[setupSubscriptions] Subscribing to direct messages for user ID: ${userId}`);
        // Subscribe to direct messages
        dmSubscription = supabase
          .channel(`direct-messages-${userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "direct_messages",
              filter: `receiver_id=eq.${userId}`,
            },
            async (payload) => {
              console.log('[DM Subscription] Received payload:', payload);
              if (payload.eventType === "INSERT" && onNewMessage) {
                const message = await fetchMessageWithUser(payload.new.id, 'direct_messages')
                if (message) {
                  onNewMessage(message)
                }
              } else if (payload.eventType === "DELETE" && onMessageDelete) {
                onMessageDelete(payload.old.id)
              }
            }
          )
          .subscribe()

        // Subscribe to thread messages for this user's direct messages
        const { data: directMessages } = await supabase
          .from('direct_messages')
          .select('id')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)

        if (directMessages?.length) {
          const messageIds = directMessages.map(m => m.id)
          console.log(`[setupSubscriptions] Subscribing to thread messages for direct messages with IDs: ${messageIds}`);
          dmThreadSubscription = supabase
            .channel(`thread-messages-dm-${userId}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "thread_messages",
                filter: `parent_type=eq.'direct' and parent_id=in.(${messageIds.join(',')})`,
              },
              async (payload) => {
                console.log('[Thread Subscription] New DM thread message:', payload.new);
                if (onNewThreadMessage) {
                  const message = await fetchMessageWithUser(payload.new.id, 'thread_messages')
                  if (message) {
                    onNewThreadMessage(
                      payload.new.parent_id.toString(),
                      message
                    )
                  }
                }
              }
            )
            .subscribe()
        } else {
          console.log('[setupSubscriptions] No direct messages found for subscription');
        }
      }
    }

    setupSubscriptions()

    return () => {
      console.log('[useEffect Cleanup] Unsubscribing from all channels');
      channelSubscription?.unsubscribe()
      dmSubscription?.unsubscribe()
      channelThreadSubscription?.unsubscribe()
      dmThreadSubscription?.unsubscribe()
    }
  }, [channelId, userId, onNewMessage, onNewThreadMessage, onMessageDelete])
} 
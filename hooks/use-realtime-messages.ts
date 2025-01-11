"use client"

import { useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import { ReactionType } from "@/types/frontend"
import { User } from "@/types/database"

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

interface ReactionRecord {
  reaction_id: number
  user_id: string
  parent_id: number
  parent_type: 'channel_message' | 'direct_message' | 'thread_message'
  emoji: string
  inserted_at: string
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
  console.log('[useRealtimeMessages] Function called with:', {
    channelId,
    userId,
    viewType
  });

  useEffect(() => {
    console.log('[useRealtimeMessages] Effect starting with:', {
      channelId,
      userId,
      viewType
    });

    // Create a unique identifier for this effect instance
    const effectId = Math.random().toString(36).substring(7);
    console.log(`[useRealtimeMessages:${effectId}] Setting up subscriptions`);

    const supabase = createClient()
    let channelSubscription: RealtimeChannel | null = null
    let dmSubscription: RealtimeChannel | null = null
    let dmReceivedSubscription: RealtimeChannel | null = null
    let channelThreadSubscription: RealtimeChannel | null = null
    let dmThreadSubscription: RealtimeChannel | null = null
    let reactionSubscription: RealtimeChannel | null = null

    const fetchMessageWithUser = async (messageId: string, table: string): Promise<Message | null> => {
      console.log(`[fetchMessageWithUser] Fetching message with ID: ${messageId} from table: ${table}`);
      let query;
      
      if (table === 'thread_messages') {
        query = supabase
          .from(table)
          .select(`
            message_id,
            message,
            inserted_at,
            parent_id,
            parent_type,
            users:user_id (
              id,
              username
            )
          `)
          .eq('message_id', messageId)
          .single()
      } else if (table === 'direct_messages') {
        query = supabase
          .from(table)
          .select(`
            message_id,
            message,
            inserted_at,
            users:sender_id (
              id,
              username
            )
          `)
          .eq('message_id', messageId)
          .single()
      } else {
        // channel_messages
        query = supabase
          .from(table)
          .select(`
            message_id,
            message,
            inserted_at,
            users:user_id (
              id,
              username
            )
          `)
          .eq('message_id', messageId)
          .single()
      }

      const { data, error } = await query
      
      if (error) {
        console.error(`[fetchMessageWithUser] Error fetching message:`, error);
        return null;
      }

      if (data) {
        console.log(`[fetchMessageWithUser] Fetched data:`, data);
        const dbMessage = data as unknown as DatabaseMessage
        
        // Transform the data based on the table type
        if (table === 'thread_messages') {
          return {
            id: dbMessage.message_id,
            message: dbMessage.message || "",
            inserted_at: dbMessage.inserted_at,
            profiles: dbMessage.users,
            parent_id: dbMessage.parent_id?.toString(),
            parent_type: dbMessage.parent_type
          }
        } else {
          return {
            id: dbMessage.message_id,
            message: dbMessage.message || "",
            inserted_at: dbMessage.inserted_at,
            profiles: dbMessage.users
          }
        }
      }
      console.log(`[fetchMessageWithUser] No data found for message ID: ${messageId}`);
      return null
    }

    const fetchReactionsForMessage = async (
      messageId: string, 
      messageType: 'channel_message' | 'direct_message' | 'thread_message'
    ): Promise<Message['reactions']> => {
      const { data: reactions } = await supabase
        .from("emoji_reactions")
        .select(`
          reaction_id,
          emoji,
          user_id,
          parent_id
        `)
        .eq('parent_id', messageId)
        .eq('parent_type', messageType)

      if (!reactions) return []

      // Group reactions by emoji
      const reactionGroups = new Map<string, Set<string>>()
      reactions.forEach(reaction => {
        if (!reactionGroups.has(reaction.emoji)) {
          reactionGroups.set(reaction.emoji, new Set())
        }
        reactionGroups.get(reaction.emoji)!.add(reaction.user_id)
      })

      return Array.from(reactionGroups.entries()).map(([emoji, users]) => ({
        emoji,
        count: users.size,
        reacted_by_me: users.has(userId || '')
      }))
    }

    const setupSubscriptions = async () => {
      console.log(`[useRealtimeMessages:${effectId}] Starting subscription setup`);
      
      try {
        // Channel messages subscription
        if (channelId) {
          console.log(`[useRealtimeMessages:${effectId}] Setting up channel subscriptions for channel ID: ${channelId}`);
          
          // Subscribe to channel messages
          channelSubscription = supabase
            .channel(`channel-messages-${channelId}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "channel_messages",
                filter: `channel_id=eq.${channelId}`,
              },
              async (payload) => {
                console.log('[Channel Subscription] Received payload:', payload);
                if (payload.eventType === "INSERT" && onNewMessage) {
                  const message = await fetchMessageWithUser(payload.new.message_id, 'channel_messages')
                  if (message) {
                    onNewMessage(message)
                  }
                } else if (payload.eventType === "DELETE" && onMessageDelete) {
                  onMessageDelete(payload.old.message_id)
                }
              }
            )

          console.log(`[useRealtimeMessages:${effectId}] Setting up thread subscription for channel messages`);
          // Subscribe to thread messages for this channel's messages
          channelThreadSubscription = supabase
            .channel(`thread-messages-channel-${channelId}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "thread_messages",
                filter: `parent_type=eq.channel_message`,
              },
              async (payload) => {
                console.log('[Thread Subscription] Received thread message payload:', {
                  payload,
                  channelId,
                  viewType
                });
                if (payload.eventType === "INSERT" && onNewThreadMessage) {
                  console.log('[Thread Subscription] Processing INSERT event');
                  // Verify this thread message belongs to our channel
                  const { data: parentMessage, error: parentError } = await supabase
                    .from('channel_messages')
                    .select('message_id, channel_id')
                    .eq('message_id', payload.new.parent_id)
                    .single()

                  if (parentError) {
                    console.error('[Thread Subscription] Error fetching parent message:', parentError);
                    return;
                  }

                  console.log('[Thread Subscription] Parent message:', {
                    parentMessage,
                    channelId,
                    matches: parentMessage?.channel_id.toString() === channelId
                  });

                  if (parentMessage && parentMessage.channel_id.toString() === channelId) {
                    console.log('[Thread Subscription] Fetching thread message details');
                    const message = await fetchMessageWithUser(payload.new.message_id, 'thread_messages')
                    console.log('[Thread Subscription] Fetched thread message:', message);
                    
                    if (message) {
                      console.log('[Thread Subscription] Calling onNewThreadMessage');
                      onNewThreadMessage(
                        payload.new.parent_id.toString(),
                        message
                      )
                    }
                  } else {
                    console.log('[Thread Subscription] Message does not belong to current channel');
                  }
                } else {
                  console.log('[Thread Subscription] Ignoring non-INSERT event:', payload.eventType);
                }
              }
            )

          // Subscribe both channels
          await channelSubscription.subscribe()
          console.log(`[useRealtimeMessages:${effectId}] Channel messages subscription active`);
          await channelThreadSubscription.subscribe()
          console.log(`[useRealtimeMessages:${effectId}] Thread messages subscription active`);
        }

        // Direct messages subscription
        if (userId) {
          console.log(`[useRealtimeMessages:${effectId}] Setting up direct message subscriptions for user ID: ${userId}`);
          
          // Subscribe to direct messages
          dmSubscription = supabase
            .channel(`direct-messages-${userId}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "direct_messages",
                filter: `sender_id=eq.${userId}`,
              },
              async (payload) => {
                console.log('[DM Subscription] Received payload:', payload);
                if (payload.eventType === "INSERT" && onNewMessage) {
                  const message = await fetchMessageWithUser(payload.new.message_id, 'direct_messages')
                  if (message) {
                    onNewMessage(message)
                  }
                } else if (payload.eventType === "DELETE" && onMessageDelete) {
                  onMessageDelete(payload.old.message_id)
                }
              }
            )

          // Subscribe to received direct messages
          dmReceivedSubscription = supabase
            .channel(`direct-messages-received-${userId}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "direct_messages",
                filter: `receiver_id=eq.${userId}`,
              },
              async (payload) => {
                console.log('[DM Received Subscription] Received payload:', payload);
                if (payload.eventType === "INSERT" && onNewMessage) {
                  const message = await fetchMessageWithUser(payload.new.message_id, 'direct_messages')
                  if (message) {
                    onNewMessage(message)
                  }
                } else if (payload.eventType === "DELETE" && onMessageDelete) {
                  onMessageDelete(payload.old.message_id)
                }
              }
            )

          console.log(`[useRealtimeMessages:${effectId}] Setting up thread subscription for direct messages`);
          // Subscribe to thread messages for this user's direct messages
          dmThreadSubscription = supabase
            .channel(`thread-messages-dm-${userId}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "thread_messages",
                filter: "parent_type=eq.direct_message",
              },
              async (payload) => {
                console.log("[Thread Subscription] New DM thread message:", payload)

                if (payload.eventType === "INSERT" && onNewThreadMessage) {
                  // Fetch the parent DM
                  const { data: parentMessage, error } = await supabase
                    .from("direct_messages")
                    .select("message_id, sender_id, receiver_id")
                    .eq("message_id", payload.new.parent_id)
                    .single()

                  if (error) {
                    console.error("[Thread Subscription] Error fetching parent DM:", error)
                    return
                  }

                  // Also check that the parent DM matches the user in this open DM
                  const otherUserId = currentViewData?.id
                  if (
                    parentMessage &&
                    (
                      // user is sender and the open conversation is with the receiver
                      (parentMessage.sender_id === userId && parentMessage.receiver_id === otherUserId) ||
                      // user is receiver and the open conversation is with the sender
                      (parentMessage.receiver_id === userId && parentMessage.sender_id === otherUserId)
                    )
                  ) {
                    // Now fetch the new thread message
                    const message = await fetchMessageWithUser(payload.new.message_id, "thread_messages")
                    if (message) {
                      onNewThreadMessage(payload.new.parent_id.toString(), message)
                    }
                  }
                }
              }
            )

          // Subscribe all DM channels
          await dmSubscription.subscribe()
          console.log(`[useRealtimeMessages:${effectId}] DM subscription active`);
          await dmReceivedSubscription.subscribe()
          console.log(`[useRealtimeMessages:${effectId}] DM received subscription active`);
          await dmThreadSubscription.subscribe()
          console.log(`[useRealtimeMessages:${effectId}] DM thread subscription active`);
        }

        // Subscribe to emoji reactions
        reactionSubscription = supabase
          .channel(`emoji-reactions`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "emoji_reactions",
              filter: userId ? `user_id=eq.${userId}` : undefined
            },
            async (payload: RealtimePostgresChangesPayload<ReactionRecord>) => {
              if (payload.eventType === "INSERT" || payload.eventType === "DELETE") {
                const messageId = (payload.eventType === "INSERT" ? payload.new : payload.old)?.parent_id
                const parentType = (payload.eventType === "INSERT" ? payload.new : payload.old)?.parent_type
                
                if (messageId && parentType) {
                  const reactions = await fetchReactionsForMessage(
                    messageId.toString(),
                    parentType
                  )
                  if (onReactionChange) {
                    onReactionChange(messageId.toString(), reactions, parentType)
                  }
                }
              }
            }
          )
          .subscribe()
      } catch (error) {
        console.error(`[useRealtimeMessages:${effectId}] Error setting up subscriptions:`, error);
      }
    }

    setupSubscriptions()

    return () => {
      console.log(`[useRealtimeMessages:${effectId}] Cleanup starting with:`, {
        channelId,
        userId,
        viewType,
        hasChannelSub: !!channelSubscription,
        hasThreadSub: !!channelThreadSubscription
      });

      if (channelSubscription) {
        console.log(`[useRealtimeMessages:${effectId}] Unsubscribing channel subscription`);
        channelSubscription.unsubscribe()
      }
      if (dmSubscription) {
        console.log(`[useRealtimeMessages:${effectId}] Unsubscribing DM subscription`);
        dmSubscription.unsubscribe()
      }
      if (dmReceivedSubscription) {
        console.log(`[useRealtimeMessages:${effectId}] Unsubscribing DM received subscription`);
        dmReceivedSubscription.unsubscribe()
      }
      if (channelThreadSubscription) {
        console.log(`[useRealtimeMessages:${effectId}] Unsubscribing channel thread subscription`);
        channelThreadSubscription.unsubscribe()
      }
      if (dmThreadSubscription) {
        console.log(`[useRealtimeMessages:${effectId}] Unsubscribing DM thread subscription`);
        dmThreadSubscription.unsubscribe()
      }
      if (reactionSubscription) {
        console.log(`[useRealtimeMessages:${effectId}] Unsubscribing reaction subscription`);
        reactionSubscription.unsubscribe()
      }
    }
  }, [channelId, userId, onNewMessage, onNewThreadMessage, onMessageDelete, onReactionChange, viewType])
} 
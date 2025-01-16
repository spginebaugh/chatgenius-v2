import { useCallback, useEffect, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { DbMessage, MessageReaction, UserStatus } from "@/types/database"
import { UiMessage } from "@/types/messages-ui"
import { useThreadMessageState } from "./use-thread-message-state"
import { RealtimeChannel } from "@supabase/supabase-js"
import { convertToUiMessage } from "@/lib/client/hooks/realtime-messages/message-converter"

interface MessageSubscription {
  message_id: number
  message: string
  message_type: DbMessage['message_type']
  user_id: string
  channel_id: number | null
  receiver_id: string | null
  parent_message_id: number | null
  thread_count: number
  inserted_at: string
  profiles?: {
    user_id: string
    username: string | null
    profile_picture_url: string | null
    status: UserStatus
  }
  files?: {
    file_id: number
    file_type: string
    file_url: string
  }[]
  reactions?: MessageReaction[]
}

export function useThreadMessages(selectedMessage: UiMessage, currentUserId: string) {
  const messageId = useMemo(() => selectedMessage.message_id, [selectedMessage.message_id])
  const { addOrUpdateMessage, removeMessage, updateMessage, threadMessages, setThreadMessages } = useThreadMessageState([])
  const supabase = createClient()
  const subscriptionRef = useRef<RealtimeChannel | null>(null)
  const lastEventRef = useRef<{ type: string; message_id: number } | null>(null)

  const handleMessageInsert = useCallback(async (message: DbMessage) => {
    const eventKey = `INSERT_${message.message_id}`
    if (lastEventRef.current?.type === eventKey) return
    lastEventRef.current = { type: eventKey, message_id: message.message_id }

    const formattedMessage = await convertToUiMessage(message, currentUserId)
    if (formattedMessage) addOrUpdateMessage(formattedMessage)
  }, [addOrUpdateMessage, currentUserId])

  const handleMessageDelete = useCallback((message: DbMessage) => {
    const eventKey = `DELETE_${message.message_id}`
    if (lastEventRef.current?.type === eventKey) return
    lastEventRef.current = { type: eventKey, message_id: message.message_id }

    removeMessage(message.message_id)
  }, [removeMessage])

  const handleMessageUpdate = useCallback(async (message: DbMessage) => {
    const eventKey = `UPDATE_${message.message_id}`
    if (lastEventRef.current?.type === eventKey) return
    lastEventRef.current = { type: eventKey, message_id: message.message_id }

    const formattedMessage = await convertToUiMessage(message, currentUserId)
    if (formattedMessage) updateMessage(message.message_id, formattedMessage)
  }, [updateMessage, currentUserId])

  // Separate effect for initial message fetch
  useEffect(() => {
    let isMounted = true

    const fetchInitialMessages = async () => {
      if (!messageId) return

      const { data: messages } = await supabase
        .from('messages')
        .select(`
          *,
          profiles:users!messages_user_id_fkey(
            user_id,
            username,
            profile_picture_url,
            status
          ),
          files:message_files(*),
          reactions:message_reactions(*)
        `)
        .eq('parent_message_id', messageId)
        .order('inserted_at', { ascending: true })

      if (!isMounted || !messages) return

      const formattedMessages = await Promise.all(messages.map(msg => convertToUiMessage(msg, currentUserId)))
      if (isMounted) {
        setThreadMessages(formattedMessages)
      }
    }

    fetchInitialMessages()
    return () => { isMounted = false }
  }, [messageId, currentUserId, setThreadMessages])

  // Separate effect for subscription management
  useEffect(() => {
    if (!messageId) return

    // Clean up previous subscription if it exists
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
      subscriptionRef.current = null
    }

    // Set up new subscription
    subscriptionRef.current = supabase
      .channel(`thread-messages-${messageId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `parent_message_id=eq.${messageId}`
        },
        payload => {
          if (payload.new && 'message_id' in payload.new) {
            handleMessageInsert(payload.new as DbMessage)
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `parent_message_id=eq.${messageId}`
        },
        payload => {
          if (payload.old && 'message_id' in payload.old) {
            handleMessageDelete(payload.old as DbMessage)
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `parent_message_id=eq.${messageId}`
        },
        payload => {
          if (payload.new && 'message_id' in payload.new) {
            handleMessageUpdate(payload.new as DbMessage)
          }
        }
      )
      .subscribe()

    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [messageId, handleMessageInsert, handleMessageDelete, handleMessageUpdate])

  const sendMessage = useCallback(async (message: string) => {
    await supabase.from('messages').insert({
      message,
      message_type: 'thread',
      user_id: currentUserId,
      parent_message_id: messageId,
      inserted_at: new Date().toISOString()
    })
  }, [messageId, currentUserId])

  return {
    threadMessages,
    addOrUpdateMessage,
    removeMessage,
    updateMessage,
    setThreadMessages,
    sendMessage
  }
} 
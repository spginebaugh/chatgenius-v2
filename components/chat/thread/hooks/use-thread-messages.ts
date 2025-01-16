import { useCallback, useEffect, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { DbMessage, MessageReaction } from "@/types/database"
import { UiMessage } from "@/types/messages-ui"
import { useThreadMessageState } from "./use-thread-message-state"
import { useMessageOperations } from "./use-message-operations"
import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js"

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
}

export function useThreadMessages(selectedMessage: UiMessage, currentUserId: string) {
  const messageId = useMemo(() => selectedMessage.message_id, [selectedMessage.message_id])
  const { addOrUpdateMessage, removeMessage, updateMessage, threadMessages } = useThreadMessageState([])
  const { fetchAndFormatMessage } = useMessageOperations(selectedMessage, currentUserId)
  const supabase = createClient()
  
  const lastEventRef = useRef<{ type: string; message_id: number } | null>(null)

  const handleMessageInsert = useCallback(async (message: DbMessage) => {
    const eventKey = `INSERT_${message.message_id}`
    if (lastEventRef.current?.type === eventKey) return
    lastEventRef.current = { type: eventKey, message_id: message.message_id }

    const formattedMessage = await fetchAndFormatMessage(message.message_id)
    if (formattedMessage) addOrUpdateMessage(formattedMessage)
  }, [addOrUpdateMessage, fetchAndFormatMessage])

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

    const formattedMessage = await fetchAndFormatMessage(message.message_id)
    if (formattedMessage) updateMessage(message.message_id, formattedMessage)
  }, [updateMessage, fetchAndFormatMessage])

  const handleReactionUpdate = useCallback(async (messageId: number, reactions: MessageReaction[]) => {
    const eventKey = `REACTION_${messageId}`
    if (lastEventRef.current?.type === eventKey) return
    lastEventRef.current = { type: eventKey, message_id: messageId }

    const formattedMessage = await fetchAndFormatMessage(messageId)
    if (formattedMessage) updateMessage(messageId, formattedMessage)
  }, [updateMessage, fetchAndFormatMessage])

  useEffect(() => {
    let subscription: RealtimeChannel | null = null

    const setupSubscription = async () => {
      const { data: channel } = await supabase
        .from('messages')
        .select<string, MessageSubscription>(`
          message_id,
          message,
          message_type,
          user_id,
          channel_id,
          receiver_id,
          parent_message_id,
          thread_count,
          inserted_at
        `)
        .eq('parent_message_id', selectedMessage.message_id)
        .order('inserted_at', { ascending: true })

      subscription = supabase
        .channel('thread-messages')
        .on<DbMessage>(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `parent_message_id=eq.${selectedMessage.message_id}`
          },
          (payload) => {
            if (payload.new && 'message_id' in payload.new) {
              handleMessageInsert(payload.new as DbMessage)
            }
          }
        )
        .on<DbMessage>(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'messages',
            filter: `parent_message_id=eq.${selectedMessage.message_id}`
          },
          (payload) => {
            if (payload.old && 'message_id' in payload.old) {
              handleMessageDelete(payload.old as DbMessage)
            }
          }
        )
        .on<DbMessage>(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `parent_message_id=eq.${selectedMessage.message_id}`
          },
          (payload) => {
            if (payload.new && 'message_id' in payload.new) {
              handleMessageUpdate(payload.new as DbMessage)
            }
          }
        )
        .subscribe()
    }

    setupSubscription()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [selectedMessage.message_id, currentUserId, handleMessageInsert, handleMessageDelete, handleMessageUpdate])

  const sendMessage = useCallback(async (message: string) => {
    await supabase.from('messages').insert({
      message,
      message_type: 'thread',
      user_id: currentUserId,
      parent_message_id: selectedMessage.message_id,
      inserted_at: new Date().toISOString()
    })
  }, [selectedMessage.message_id, currentUserId])

  return {
    sendMessage,
    handleReactionUpdate,
    threadMessages
  }
} 
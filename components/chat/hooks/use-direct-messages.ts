import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { DbMessage, MessageReaction, UserStatus } from "@/types/database"
import { UiMessage } from "@/types/messages-ui"
import { RealtimeChannel } from "@supabase/supabase-js"
import { convertToUiMessage } from "@/lib/client/hooks/realtime-messages/message-converter"

export function useDirectMessages(currentUserId: string, otherUserId: string) {
  const [messages, setMessages] = useState<UiMessage[]>([])
  const supabase = createClient()
  const subscriptionRef = useRef<RealtimeChannel | null>(null)
  const lastEventRef = useRef<{ type: string; message_id: number } | null>(null)

  const addOrUpdateMessage = useCallback((message: UiMessage) => {
    setMessages(prev => {
      const index = prev.findIndex(m => m.message_id === message.message_id)
      if (index === -1) {
        return [...prev, message]
      }
      const newMessages = [...prev]
      newMessages[index] = message
      return newMessages
    })
  }, [])

  const removeMessage = useCallback((messageId: number) => {
    setMessages(prev => prev.filter(m => m.message_id !== messageId))
  }, [])

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
    if (formattedMessage) addOrUpdateMessage(formattedMessage)
  }, [addOrUpdateMessage, currentUserId])

  // Fetch initial messages
  useEffect(() => {
    let isMounted = true

    const fetchInitialMessages = async () => {
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
        .eq('message_type', 'direct')
        .or(`and(user_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
        .order('inserted_at', { ascending: true })

      if (!isMounted || !messages) return

      const formattedMessages = await Promise.all(messages.map(msg => convertToUiMessage(msg, currentUserId)))
      if (isMounted) {
        setMessages(formattedMessages)
      }
    }

    fetchInitialMessages()
    return () => { isMounted = false }
  }, [currentUserId, otherUserId])

  // Set up realtime subscription
  useEffect(() => {
    // Clean up previous subscription if it exists
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
      subscriptionRef.current = null
    }

    // Set up new subscription
    subscriptionRef.current = supabase
      .channel(`direct-messages-${currentUserId}-${otherUserId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `message_type=eq.direct&or=(and(user_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},receiver_id.eq.${currentUserId}))`
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
          filter: `message_type=eq.direct&or=(and(user_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},receiver_id.eq.${currentUserId}))`
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
          filter: `message_type=eq.direct&or=(and(user_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},receiver_id.eq.${currentUserId}))`
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
  }, [currentUserId, otherUserId, handleMessageInsert, handleMessageDelete, handleMessageUpdate])

  const sendMessage = useCallback(async (message: string) => {
    await supabase.from('messages').insert({
      message,
      message_type: 'direct',
      user_id: currentUserId,
      receiver_id: otherUserId,
      inserted_at: new Date().toISOString()
    })
  }, [currentUserId, otherUserId])

  return {
    messages,
    sendMessage
  }
} 
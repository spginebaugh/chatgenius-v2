import { useCallback, useEffect, useMemo, useRef } from "react"
import type { MessageReaction, DbMessage } from "@/types/database"
import type { UiMessage } from "@/types/messages-ui"
import { formatReactions } from "@/lib/stores/messages/utils"
import { useMessageOperations } from "./use-message-operations"
import { useThreadMessageState } from "./use-thread-message-state"
import { useRealtimeMessages } from "@/lib/client/hooks/realtime-messages"
import { createClient } from "@/lib/supabase/client"
import { formatMessageWithJoins } from "../utils/message-formatter"

function useThreadMessageOperations(
  selectedMessage: UiMessage,
  currentUserId: string,
  messageState: ReturnType<typeof useThreadMessageState>
) {
  const messageId = useMemo(() => selectedMessage.id, [selectedMessage.id])
  const { fetchAndFormatMessage } = useMessageOperations(selectedMessage, currentUserId)
  const { addMessage, removeMessage, updateMessage } = messageState
  const lastEventRef = useRef<{ type: string; id: number } | null>(null)

  const handleNewMessage = useCallback(async (message: DbMessage) => {
    if (message.parent_message_id !== messageId || message.message_type !== 'thread') return

    const eventKey = `INSERT_${message.id}`
    if (lastEventRef.current?.type === eventKey) return
    lastEventRef.current = { type: eventKey, id: message.id }

    const formattedMessage = await fetchAndFormatMessage(message.id)
    if (!formattedMessage) return

    addMessage(formattedMessage)
  }, [messageId, fetchAndFormatMessage, addMessage])

  const handleDeleteMessage = useCallback((message: DbMessage) => {
    if (message.parent_message_id !== messageId || message.message_type !== 'thread') return

    const eventKey = `DELETE_${message.id}`
    if (lastEventRef.current?.type === eventKey) return
    lastEventRef.current = { type: eventKey, id: message.id }

    removeMessage(message.id)
  }, [messageId, removeMessage])

  const handleUpdateMessage = useCallback(async (message: DbMessage) => {
    if (message.parent_message_id !== messageId || message.message_type !== 'thread') return

    const eventKey = `UPDATE_${message.id}`
    if (lastEventRef.current?.type === eventKey) return
    lastEventRef.current = { type: eventKey, id: message.id }

    const formattedMessage = await fetchAndFormatMessage(message.id)
    if (!formattedMessage) return

    updateMessage(message.id, formattedMessage)
  }, [messageId, fetchAndFormatMessage, updateMessage])

  const handleUpdateReactions = useCallback((messageId: number, reactions: MessageReaction[]) => {
    const eventKey = `REACTION_${messageId}`
    if (lastEventRef.current?.type === eventKey) return
    lastEventRef.current = { type: eventKey, id: messageId }

    const formattedReactions = formatReactions(reactions, currentUserId)
    updateMessage(messageId, prevMessage => ({
      ...prevMessage,
      reactions: formattedReactions
    }))
  }, [currentUserId, updateMessage])

  return useMemo(() => ({
    handleNewMessage,
    handleDeleteMessage,
    handleUpdateMessage,
    handleUpdateReactions
  }), [handleNewMessage, handleDeleteMessage, handleUpdateMessage, handleUpdateReactions])
}

function useThreadMessageInitialization(
  selectedMessage: UiMessage,
  currentUserId: string,
  setThreadMessages: (messages: UiMessage[]) => void
) {
  const { fetchAndFormatMessage } = useMessageOperations(selectedMessage, currentUserId)
  const supabase = createClient()

  useEffect(() => {
    const fetchThreadMessages = async () => {
      const { data: messages } = await supabase
        .from('messages')
        .select(`
          *,
          profiles:users!messages_user_id_fkey(
            id,
            username,
            profile_picture_url,
            status
          ),
          files:message_files(*),
          reactions:message_reactions(*)
        `)
        .eq('parent_message_id', selectedMessage.id)
        .eq('message_type', 'thread')
        .order('inserted_at', { ascending: true })

      if (!messages?.length) {
        setThreadMessages([])
        return
      }

      const formattedMessages = await Promise.all(
        messages.map(async (msg: DbMessage) => formatMessageWithJoins(msg, currentUserId))
      )

      setThreadMessages(formattedMessages.filter((msg): msg is UiMessage => msg !== null))
    }

    fetchThreadMessages()
  }, [selectedMessage.id, currentUserId, setThreadMessages])
}

export function useThreadMessages(selectedMessage: UiMessage, currentUserId: string) {
  const messageState = useThreadMessageState(selectedMessage.thread_messages || [])
  const { threadMessages, setThreadMessages } = messageState
  
  const operations = useThreadMessageOperations(selectedMessage, currentUserId, messageState)

  useThreadMessageInitialization(selectedMessage, currentUserId, setThreadMessages)

  // Memoize the subscription config to prevent unnecessary re-subscriptions
  const subscriptionConfig = useMemo(() => ({
    parentMessageId: selectedMessage.id,
    onNewMessage: operations.handleNewMessage,
    onMessageDelete: operations.handleDeleteMessage,
    onMessageUpdate: operations.handleUpdateMessage,
    onReactionUpdate: operations.handleUpdateReactions
  }), [
    selectedMessage.id,
    operations.handleNewMessage,
    operations.handleDeleteMessage,
    operations.handleUpdateMessage,
    operations.handleUpdateReactions
  ])

  // Setup realtime subscriptions for thread messages
  useRealtimeMessages(subscriptionConfig)

  return useMemo(() => ({
    threadMessages,
    ...operations
  }), [threadMessages, operations])
} 
import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { UiMessage, UiFileAttachment } from "@/types/messages-ui"
import type { DbMessage, MessageFile, MessageReaction } from "@/types/database"
import { handleMessage } from "@/app/actions/messages/handle-message"
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface ReactionPayload extends MessageReaction {
  message_id: number
}

interface FilePayload extends MessageFile {
  message_id: number
}

function isReactionPayload(payload: any): payload is ReactionPayload {
  return payload && typeof payload === 'object' && 'message_id' in payload
}

function isFilePayload(payload: any): payload is FilePayload {
  return payload && typeof payload === 'object' && 'message_id' in payload
}

export function useChannelMessages(channelId: number, userId: string) {
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const isMounted = useRef(true)
  
  // Memoize the message IDs filter to avoid recreating it on every render
  const messageIdsFilter = useMemo(() => {
    const messageIds = messages.map(m => m.message_id)
    return messageIds.length > 0 
      ? `message_id=in.(${messageIds.join(',')})` 
      : 'message_id=eq.0' // Use 0 as it's a valid integer but won't match any real messages
  }, [messages])

  const updateMessageReactions = useCallback(async (messageId: number) => {
    if (!isMounted.current) return

    const { data } = await supabase
      .from('messages')
      .select('reactions:message_reactions(*)')
      .eq('message_id', messageId)
      .single()

    if (data && isMounted.current) {
      setMessages(prev => prev.map(msg => 
        msg.message_id === messageId
          ? { ...msg, reactions: data.reactions || [] }
          : msg
      ))
    }
  }, [supabase])

  const updateMessageFiles = useCallback(async (messageId: number) => {
    if (!isMounted.current) return

    const { data } = await supabase
      .from('messages')
      .select('files:message_files(*)')
      .eq('message_id', messageId)
      .single()

    if (data && isMounted.current) {
      setMessages(prev => prev.map(msg => 
        msg.message_id === messageId
          ? {
              ...msg,
              files: (data.files || []).map((file: MessageFile): UiFileAttachment => ({
                url: file.file_url,
                type: file.file_type,
                name: file.file_url.split('/').pop() || 'file',
                vector_status: file.vector_status as UiFileAttachment['vector_status']
              }))
            }
          : msg
      ))
    }
  }, [supabase])

  const fetchMessages = useCallback(async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
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
          reactions:message_reactions(*),
          mentions:message_mentions(*)
        `)
        .eq('channel_id', channelId)
        .eq('message_type', 'channel')
        .order('inserted_at', { ascending: true })

      if (error) throw error

      if (isMounted.current) {
        const uiMessages = data.map(msg => ({
          ...msg,
          profiles: msg.profiles || {
            user_id: msg.user_id,
            username: 'Unknown',
            profile_picture_url: null,
            status: 'OFFLINE'
          },
          reactions: msg.reactions || [],
          files: (msg.files || []).map((file: MessageFile) => ({
            url: file.file_url,
            type: file.file_type,
            name: file.file_url.split('/').pop() || 'file',
            vector_status: file.vector_status
          })),
          thread_messages: []
        }))
        setMessages(uiMessages)
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch messages')
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false)
      }
    }
  }, [channelId, supabase])

  useEffect(() => {
    isMounted.current = true
    
    // Clean up previous subscription if it exists
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    // Fetch initial messages
    fetchMessages()

    // Set up new subscription
    const channel = supabase
      .channel(`channel-${channelId}`)
      .on<RealtimePostgresChangesPayload<DbMessage>>('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`
      }, async (payload) => {
        if (!isMounted.current || !payload.new) return

        // Type guard to ensure we have a message_id
        const messageId = (payload.new as unknown as DbMessage).message_id
        if (!messageId) return

        const { data } = await supabase
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
            reactions:message_reactions(*),
            mentions:message_mentions(*)
          `)
          .eq('message_id', messageId)
          .single()

        if (data && isMounted.current) {
          const newMessage = {
            ...data,
            profiles: data.profiles || {
              user_id: data.user_id,
              username: 'Unknown',
              profile_picture_url: null,
              status: 'OFFLINE'
            },
            reactions: data.reactions || [],
            files: (data.files || []).map((file: MessageFile): UiFileAttachment => ({
              url: file.file_url,
              type: file.file_type,
              name: file.file_url.split('/').pop() || 'file',
              vector_status: file.vector_status as UiFileAttachment['vector_status']
            })),
            thread_messages: []
          }
          setMessages(prev => [...prev, newMessage])
        }
      })
      // Add subscription for reactions
      .on<RealtimePostgresChangesPayload<MessageReaction>>('postgres_changes', {
        event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'message_reactions',
        filter: messageIdsFilter
      }, async (payload) => {
        if (!payload.new) return
        const messageId = (payload.new as unknown as MessageReaction).message_id
        if (!messageId) return
        await updateMessageReactions(messageId)
      })
      // Add subscription for file uploads
      .on<RealtimePostgresChangesPayload<MessageFile>>('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'message_files',
        filter: messageIdsFilter
      }, async (payload) => {
        if (!payload.new) return
        const messageId = (payload.new as unknown as MessageFile).message_id
        if (!messageId) return
        await updateMessageFiles(messageId)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      isMounted.current = false
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [channelId, supabase, fetchMessages, messageIdsFilter, updateMessageReactions, updateMessageFiles])

  const sendMessage = useCallback(async (message: string, files?: UiFileAttachment[], isRagQuery?: boolean, isImageGeneration?: boolean) => {
    try {
      await handleMessage({
        message,
        channelId,
        files,
        isRagQuery,
        isImageGeneration
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      throw err
    }
  }, [channelId])

  return useMemo(() => ({
    messages,
    isLoading,
    error,
    sendMessage
  }), [messages, isLoading, error, sendMessage])
} 
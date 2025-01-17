import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { UiMessage, UiFileAttachment } from "@/types/messages-ui"
import type { DbMessage, MessageFile, MessageReaction, User } from "@/types/database"
import type { RealtimeChannel, RealtimePostgresChangesPayload, RealtimePostgresUpdatePayload } from '@supabase/supabase-js'
import { handleMessage } from "@/app/actions/messages/handle-message"

const RAG_BOT_USER_ID = '00000000-0000-0000-0000-000000000000'

interface FilePayload extends MessageFile {
  message_id: number
}

function isFilePayload(payload: any): payload is FilePayload {
  return payload && typeof payload === 'object' && 'message_id' in payload
}

export function useDirectMessages(currentUserId: string, otherUserId: string) {
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const isMounted = useRef(true)

  // Reset state when switching users
  useEffect(() => {
    setMessages([])
    setIsLoading(true)
    setError(null)
    isMounted.current = true

    return () => {
      isMounted.current = false
    }
  }, [currentUserId, otherUserId])

  const fetchMessages = useCallback(async () => {
    if (!isMounted.current) return

    try {
      setIsLoading(true)
      setError(null)
      
      // First get base messages between users
      const { data: baseMessages, error: baseError } = await supabase
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
        .eq('message_type', 'direct')
        .or(`and(user_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
        .order('inserted_at', { ascending: true })

      if (baseError) throw baseError
      
      // Get message IDs from base messages
      const baseMessageIds = (baseMessages || []).map(m => m.message_id)

      let allMessages = baseMessages || []
      
      // Only fetch RAG messages if there are base messages
      if (baseMessageIds.length > 0) {
        // Then get RAG bot responses
        const { data: ragMessages, error: ragError } = await supabase
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
          .eq('message_type', 'direct')
          .eq('user_id', RAG_BOT_USER_ID)
          .in('parent_message_id', baseMessageIds)
          .order('inserted_at', { ascending: true })

        if (ragError) throw ragError
        
        // Add RAG messages to the list
        allMessages = [...allMessages, ...(ragMessages || [])]
      }

      // Sort all messages
      allMessages.sort((a, b) => new Date(a.inserted_at).getTime() - new Date(b.inserted_at).getTime())

      if (!isMounted.current) return

      const uiMessages = allMessages.map(msg => ({
        ...msg,
        profiles: msg.profiles || {
          user_id: msg.user_id,
          username: 'Unknown',
          profile_picture_url: null,
          status: 'OFFLINE'
        },
        reactions: msg.reactions || [],
        files: (msg.files || []).map((file: MessageFile): UiFileAttachment => ({
          url: file.file_url,
          type: file.file_type,
          name: file.file_url.split('/').pop() || 'file',
          vector_status: file.vector_status as UiFileAttachment['vector_status']
        })),
        thread_messages: []
      }))
      
      if (isMounted.current) {
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
  }, [currentUserId, otherUserId, supabase])

  // Initial fetch of messages
  useEffect(() => {
    let ignore = false

    const doFetch = async () => {
      if (!ignore) {
        await fetchMessages()
      }
    }

    doFetch()

    return () => {
      ignore = true
    }
  }, [fetchMessages])

  // Set up realtime subscription
  useEffect(() => {
    if (!isMounted.current) return

    // Clean up any existing subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    const channel = supabase.channel(`direct_messages_${currentUserId}_${otherUserId}`)
      
    channel.on('postgres_changes' as const, {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `message_type=eq.direct`
    }, async (payload) => {
      if (!isMounted.current || !payload.new) return
      
      const messageId = (payload.new as unknown as DbMessage).message_id
      if (!messageId) return

      const msg = payload.new as unknown as DbMessage
      const isRelevant = (
        (msg.user_id === currentUserId && msg.receiver_id === otherUserId) ||
        (msg.user_id === otherUserId && msg.receiver_id === currentUserId) ||
        (msg.user_id === RAG_BOT_USER_ID && (msg.receiver_id === currentUserId || msg.receiver_id === otherUserId))
      )
      if (!isRelevant) return

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
      
    // Subscribe to user profile changes
    channel.on('postgres_changes' as const, {
      event: 'UPDATE',
      schema: 'public',
      table: 'users',
      filter: `user_id=in.(${currentUserId},${otherUserId})`
    }, async (payload: RealtimePostgresUpdatePayload<User>) => {
      if (!isMounted.current || !payload.new) return

      setMessages(prev => prev.map(msg => {
        if (msg.profiles.user_id === payload.new.user_id) {
          return {
            ...msg,
            profiles: {
              user_id: payload.new.user_id,
              username: payload.new.username || 'Unknown',
              profile_picture_url: payload.new.profile_picture_url,
              status: payload.new.status || 'OFFLINE'
            }
          }
        }
        return msg
      }))
    })

    // Subscribe to file updates
    channel.on('postgres_changes' as const, {
      event: '*',
      schema: 'public',
      table: 'message_files',
    }, async (payload: RealtimePostgresChangesPayload<FilePayload>) => {
      if (!isMounted.current || !payload.new || !isFilePayload(payload.new)) return

      const messageId = payload.new.message_id
      if (!messageId) return

      // Fetch the updated message to get all its data
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
        setMessages(prev => prev.map(msg => {
          if (msg.message_id === messageId) {
            return {
              ...msg,
              files: (data.files || []).map((file: MessageFile): UiFileAttachment => ({
                url: file.file_url,
                type: file.file_type,
                name: file.file_url.split('/').pop() || 'file',
                vector_status: file.vector_status as UiFileAttachment['vector_status']
              }))
            }
          }
          return msg
        }))
      }
    })

    channelRef.current = channel
    channel.subscribe()

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
      channelRef.current = null
    }
  }, [currentUserId, otherUserId, supabase])

  const sendMessage = useCallback(async (message: string, files?: UiFileAttachment[], isRagQuery?: boolean, isImageGeneration?: boolean) => {
    try {
      await handleMessage({
        message,
        receiverId: otherUserId,
        files,
        isRagQuery,
        isImageGeneration
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      throw err
    }
  }, [otherUserId])

  return useMemo(() => ({
    messages,
    isLoading,
    error,
    sendMessage
  }), [messages, isLoading, error, sendMessage])
} 
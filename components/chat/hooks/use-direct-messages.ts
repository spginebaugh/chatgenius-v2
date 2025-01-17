import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { UiMessage, UiFileAttachment } from "@/types/messages-ui"
import type { DbMessage, MessageFile } from "@/types/database"
import { handleMessage } from "@/app/actions/messages/handle-message"

export function useDirectMessages(currentUserId: string, otherUserId: string) {
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const isMounted = useRef(true)

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
        .eq('message_type', 'direct')
        .or(`and(user_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
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
  }, [currentUserId, otherUserId, supabase])

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
      .channel(`direct-${currentUserId}-${otherUserId}`)
      .on<DbMessage>('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `message_type=eq.direct`
      }, async (payload) => {
        if (!isMounted.current || !payload.new) return
        
        // Only process messages that are part of this conversation
        const msg = payload.new
        const isRelevant = (
          (msg.user_id === currentUserId && msg.receiver_id === otherUserId) ||
          (msg.user_id === otherUserId && msg.receiver_id === currentUserId)
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
          .eq('message_id', payload.new.message_id)
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
            files: (data.files || []).map((file: MessageFile) => ({
              url: file.file_url,
              type: file.file_type,
              name: file.file_url.split('/').pop() || 'file',
              vector_status: file.vector_status
            })),
            thread_messages: []
          }
          setMessages(prev => [...prev, newMessage])
        }
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
  }, [currentUserId, otherUserId, supabase, fetchMessages])

  const sendMessage = useCallback(async (message: string, files?: UiFileAttachment[], isRagQuery?: boolean, isImageGeneration?: boolean) => {
    try {
      const result = await handleMessage({
        message,
        receiverId: otherUserId,
        files,
        isRagQuery,
        isImageGeneration
      })

      if (isMounted.current) {
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
          .eq('message_id', result.message_id)
          .single()

        if (data) {
          const newMessage = {
            ...data,
            profiles: data.profiles || {
              user_id: data.user_id,
              username: 'Unknown',
              profile_picture_url: null,
              status: 'OFFLINE'
            },
            reactions: data.reactions || [],
            files: (data.files || []).map((file: MessageFile) => ({
              url: file.file_url,
              type: file.file_type,
              name: file.file_url.split('/').pop() || 'file',
              vector_status: file.vector_status
            })),
            thread_messages: []
          }
          setMessages(prev => [...prev, newMessage])
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      throw err
    }
  }, [otherUserId, supabase])

  return useMemo(() => ({
    messages,
    isLoading,
    error,
    sendMessage
  }), [messages, isLoading, error, sendMessage])
} 
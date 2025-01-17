import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { UiMessage, UiFileAttachment } from "@/types/messages-ui"
import type { DbMessage, MessageFile } from "@/types/database"
import { convertToUiMessage } from '@/lib/client/hooks/message-converter'
import { handleMessage } from "@/app/actions/messages/handle-message"

export function useThreadMessages(selectedMessage: UiMessage) {
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const messageId = selectedMessage?.message_id
  const supabase = useMemo(() => createClient(), [])
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const isMounted = useRef(true)

  // Memoize the fetch function to prevent recreation on every render
  const fetchMessages = useCallback(async () => {
    if (!messageId) return

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
        .eq('parent_message_id', messageId)
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
  }, [messageId, supabase])

  // Set up and clean up realtime subscription
  useEffect(() => {
    isMounted.current = true
    if (!messageId) return

    // Clean up previous subscription if it exists
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }
    
    // Fetch initial messages
    fetchMessages()
    
    // Set up new subscription
    const channel = supabase
      .channel(`thread-${messageId}`)
      .on<DbMessage>('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `parent_message_id=eq.${messageId}`
      }, async (payload) => {
        if (!isMounted.current || !payload.new) return

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
  }, [messageId, supabase, fetchMessages])

  const sendMessage = useCallback(async (message: string, files?: UiFileAttachment[], isRagQuery?: boolean, isImageGeneration?: boolean) => {
    if (!messageId) throw new Error('No parent message selected')

    try {
      const result = await handleMessage({
        message,
        parentMessageId: messageId,
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
  }, [messageId, supabase])

  return useMemo(() => ({
    messages,
    isLoading,
    error,
    sendMessage
  }), [messages, isLoading, error, sendMessage])
} 
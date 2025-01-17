import { useState, useEffect, useRef, useMemo } from 'react'
import type { UiMessage } from '@/types/messages-ui'
import { createClient } from '@/lib/supabase/client'
import { formatMessageForClient as convertToUiMessage } from '@/app/_lib/messages/client/format-messages'
import type { MessageWithJoins } from '@/app/_lib/messages/queries/types'

export function useMessageFetch({
  channelId,
  receiverId,
  parentMessageId,
  initialMessages = []
}: {
  channelId?: number
  receiverId?: string
  parentMessageId?: number
  initialMessages?: UiMessage[]
}) {
  const [messages, setMessages] = useState<UiMessage[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const isMounted = useRef(true)

  const messageType = parentMessageId ? 'thread' : channelId ? 'channel' : 'direct'
  const messageFilter = parentMessageId ? 'parent_message_id' : channelId ? 'channel_id' : 'message_type'
  const messageValue = parentMessageId || channelId || 'direct'

  const fetchMessages = async () => {
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
        .eq('message_type', messageType)
        .eq(messageFilter, messageValue)
        .order('inserted_at', { ascending: true })

      if (error) throw error

      const uiMessages = await Promise.all(
        (data || []).map(msg => convertToUiMessage(msg))
      )
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
  }

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
      .channel(`messages-${messageType}-${messageValue}`)
      .on<MessageWithJoins>('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `${messageFilter}=eq.${messageValue}`
      }, async (payload) => {
        if (!isMounted.current || !payload.new) return

        // Fetch the complete message with joins
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
          const newMessage = await convertToUiMessage(data)
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
  }, [channelId, receiverId, parentMessageId, messageType, messageFilter, messageValue, supabase])

  return {
    messages,
    isLoading,
    error
  }
} 

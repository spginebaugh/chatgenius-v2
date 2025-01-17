import { useEffect, useState } from "react"
import type { UiMessage } from "@/types/messages-ui"
import { createClient } from "@/lib/supabase/client"
import { convertToUiMessage } from "@/lib/client/hooks/message-converter"

export function useChatMessages({
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
  const supabase = createClient()

  useEffect(() => {
    async function fetchMessages() {
      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('message_type', parentMessageId ? 'thread' : channelId ? 'channel' : 'direct')
          .eq(parentMessageId ? 'parent_message_id' : channelId ? 'channel_id' : 'message_type', parentMessageId || channelId || 'direct')
          .order('inserted_at', { ascending: true })

        if (error) throw error

        const uiMessages = await Promise.all(
          (data || []).map(msg => convertToUiMessage(msg))
        )
        setMessages(uiMessages)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch messages')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMessages()
  }, [channelId, receiverId, parentMessageId])

  return {
    messages,
    isLoading,
    error
  }
} 
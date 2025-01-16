import { createClient } from "@/lib/supabase/client"
import type { UiMessage } from "@/types/messages-ui"
import { formatMessageWithJoins } from "../utils/message-formatter"
import { useCallback } from "react"

export function useMessageOperations(selectedMessage: UiMessage, currentUserId: string) {
  const supabase = createClient()

  const fetchAndFormatMessage = async (messageId: number): Promise<UiMessage | null> => {
    const { data: messageWithJoins } = await supabase
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
      .eq('message_id', messageId)
      .single()

    if (!messageWithJoins) return null
    return formatMessageWithJoins(messageWithJoins, currentUserId)
  }

  const deleteMessage = useCallback(async (messageId: number) => {
    await supabase
      .from('messages')
      .delete()
      .eq('message_id', messageId)
  }, [])

  return {
    fetchAndFormatMessage,
    deleteMessage
  }
}
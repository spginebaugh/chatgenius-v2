import { createClient } from "@/lib/supabase/client"
import type { UiMessage } from "@/types/messages-ui"
import { formatMessageWithJoins } from "../utils/message-formatter"

export function useMessageOperations(selectedMessage: UiMessage, currentUserId: string) {
  const supabase = createClient()

  const fetchAndFormatMessage = async (messageId: number): Promise<UiMessage | null> => {
    const { data: messageWithJoins } = await supabase
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
      .eq('id', messageId)
      .single()

    if (!messageWithJoins) return null
    return formatMessageWithJoins(messageWithJoins, currentUserId)
  }

  return { fetchAndFormatMessage }
} 
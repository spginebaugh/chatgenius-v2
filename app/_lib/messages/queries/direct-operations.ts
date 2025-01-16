import { createClient } from '@/app/_lib/supabase-server'
import type { DbMessage } from '@/types/database'
import type { UiMessage } from '@/types/messages-ui'
import { THREAD_MESSAGE_QUERY } from './types'
import { formatMessageForDisplay } from './format-messages'
import { fetchThreadMessages, groupThreadMessagesByParent, formatThreadMessages } from './thread-operations'
import type { MessageWithJoins } from './types'

async function fetchDirectMessages(userId: string, otherUserId: string): Promise<DbMessage[]> {
  const supabase = await createClient()
  const { data: messages, error } = await supabase
    .from('messages')
    .select(THREAD_MESSAGE_QUERY)
    .eq('message_type', 'direct')
    .or(`and(user_id.eq.${userId},receiver_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .order('inserted_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return messages || []
}

export async function getDirectMessages(userId: string, otherUserId: string): Promise<UiMessage[]> {
  const messages = await fetchDirectMessages(userId, otherUserId)

  if (!messages.length) return []

  // Fetch and attach thread messages
  const messageIds = messages.map(m => m.message_id)
  const threadMessages = await fetchThreadMessages(messageIds)
  const threadMessagesByParent = groupThreadMessagesByParent(threadMessages)

  // Format messages and attach thread messages
  const formattedMessages = await Promise.all(
    messages.map(async message => {
      const formattedMessage = await formatMessageForDisplay(message as MessageWithJoins)
      const threadMessagesForParent = threadMessagesByParent[message.message_id] || []
      formattedMessage.thread_messages = await formatThreadMessages(threadMessagesForParent)
      return formattedMessage
    })
  )

  return formattedMessages
} 
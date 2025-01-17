import { createClient } from '@/app/_lib/supabase-server'
import type { DbMessage } from '@/types/database'
import type { UiMessage } from '@/types/messages-ui'
import { THREAD_MESSAGE_QUERY } from './types'
import { formatMessageForDisplay } from './format-messages'
import { fetchThreadMessages, groupThreadMessagesByParent, formatThreadMessages } from './thread-operations'
import type { MessageWithJoins } from './types'

const RAG_BOT_USER_ID = '00000000-0000-0000-0000-000000000000'

async function fetchDirectMessages(userId: string, otherUserId: string): Promise<DbMessage[]> {
  console.log('[fetchDirectMessages] Starting fetch for users:', { userId, otherUserId })
  const supabase = await createClient()
  
  // First get the base DM messages between users
  const baseQuery = supabase
    .from('messages')
    .select(THREAD_MESSAGE_QUERY)
    .eq('message_type', 'direct')
    .or(
      `and(user_id.eq.${userId},receiver_id.eq.${otherUserId}),` +
      `and(user_id.eq.${otherUserId},receiver_id.eq.${userId})`
    )

  const { data: baseMessages, error: baseError } = await baseQuery

  if (baseError) {
    console.error('[fetchDirectMessages] Error fetching base messages:', baseError)
    throw baseError
  }

  // Get message IDs from the base messages
  const baseMessageIds = baseMessages?.map(m => m.message_id) || []

  // Then get RAG bot responses that are linked to these messages
  const ragQuery = supabase
    .from('messages')
    .select(THREAD_MESSAGE_QUERY)
    .eq('message_type', 'direct')
    .eq('user_id', RAG_BOT_USER_ID)
    .or(
      `parent_message_id.in.(${baseMessageIds.join(',')}),` +
      `and(receiver_id.eq.${userId},user_id.eq.${RAG_BOT_USER_ID}),` +
      `and(receiver_id.eq.${otherUserId},user_id.eq.${RAG_BOT_USER_ID})`
    )

  const { data: ragMessages, error: ragError } = await ragQuery

  if (ragError) {
    console.error('[fetchDirectMessages] Error fetching RAG messages:', ragError)
    throw ragError
  }

  // Combine and sort all messages
  const allMessages = [...(baseMessages || []), ...(ragMessages || [])]
  allMessages.sort((a, b) => new Date(a.inserted_at).getTime() - new Date(b.inserted_at).getTime())

  console.log('[fetchDirectMessages] Retrieved messages:', { count: allMessages.length })
  return allMessages
}

export async function getDirectMessages(userId: string, otherUserId: string): Promise<UiMessage[]> {
  console.log('[getDirectMessages] Starting message retrieval for users:', { userId, otherUserId })
  const messages = await fetchDirectMessages(userId, otherUserId)

  if (!messages.length) {
    console.log('[getDirectMessages] No messages found')
    return []
  }

  console.log('[getDirectMessages] Fetching thread messages')
  const messageIds = messages.map(m => m.message_id)
  const threadMessages = await fetchThreadMessages(messageIds)
  console.log('[getDirectMessages] Retrieved thread messages:', { count: threadMessages.length, threadMessages })

  const threadMessagesByParent = groupThreadMessagesByParent(threadMessages)
  console.log('[getDirectMessages] Grouped thread messages by parent:', threadMessagesByParent)

  console.log('[getDirectMessages] Formatting messages')
  const formattedMessages = await Promise.all(
    messages.map(async message => {
      const formattedMessage = await formatMessageForDisplay(message as MessageWithJoins)
      const threadMessagesForParent = threadMessagesByParent[message.message_id] || []
      formattedMessage.thread_messages = await formatThreadMessages(threadMessagesForParent)
      return formattedMessage
    })
  )

  console.log('[getDirectMessages] Returning formatted messages:', { count: formattedMessages.length })
  return formattedMessages
} 
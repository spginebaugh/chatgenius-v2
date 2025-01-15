import { createClient } from '@/app/_lib/supabase-server'
import type { DbMessage } from '@/types/database'
import type { UiMessage } from '@/types/messages-ui'
import { THREAD_MESSAGE_QUERY } from './types'
import { formatMessageForDisplay } from './format-messages'
import type { MessageWithJoins } from './types'

export async function fetchThreadMessages(messageIds: number[]): Promise<DbMessage[]> {
  const supabase = await createClient()
  const { data: threadMessages, error } = await supabase
    .from('messages')
    .select(THREAD_MESSAGE_QUERY)
    .in('parent_message_id', messageIds)
    .eq('message_type', 'thread')
    .order('inserted_at', { ascending: true })

  if (error) throw error
  return threadMessages || []
}

export function groupThreadMessagesByParent(threadMessages: DbMessage[]): Record<number, DbMessage[]> {
  return threadMessages.reduce((acc, tm) => {
    if (!tm.parent_message_id) return acc
    if (!acc[tm.parent_message_id]) {
      acc[tm.parent_message_id] = []
    }
    acc[tm.parent_message_id].push(tm)
    return acc
  }, {} as Record<number, DbMessage[]>)
}

export async function formatThreadMessages(threadMessages: DbMessage[], currentUserId?: string): Promise<UiMessage[]> {
  return Promise.all(
    threadMessages.map(tm => formatMessageForDisplay(tm as MessageWithJoins, currentUserId))
  )
} 
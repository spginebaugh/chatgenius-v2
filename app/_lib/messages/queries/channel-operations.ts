import { createClient } from '@/app/_lib/supabase-server'
import type { UiMessage } from '@/types/messages-ui'
import { BASE_MESSAGE_QUERY } from './types'
import { formatMessageForDisplay } from './format-messages'
import type { MessageWithJoins } from './types'

export async function getChannelMessages(channelId: number): Promise<UiMessage[]> {
  const supabase = await createClient()
  
  const { data: messages, error } = await supabase
    .from('messages')
    .select(BASE_MESSAGE_QUERY)
    .eq('channel_id', channelId)
    .order('inserted_at', { ascending: true })

  if (error) throw error
  if (!messages) return []

  const formattedMessages = await Promise.all(
    (messages as MessageWithJoins[]).map(message => formatMessageForDisplay(message))
  )
  return formattedMessages
} 
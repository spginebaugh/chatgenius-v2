import { createClient } from '@/lib/supabase/client'

export interface MessageQueryParams {
  channelId?: number
  receiverId?: string
  parentMessageId?: number
}

export const messageFields = `
  profiles:users!messages_user_id_fkey(user_id, username),
  message_files(file_id, file_type, file_url),
  message_id,
  message,
  message_type,
  user_id,
  channel_id,
  receiver_id,
  parent_message_id,
  thread_count,
  inserted_at
`

export function buildMessageQuery(supabase: ReturnType<typeof createClient>, params: MessageQueryParams) {
  let query = supabase
    .from('messages')
    .select(messageFields)

  if (params.channelId) query = query.eq('channel_id', params.channelId)
  if (params.receiverId) query = query.eq('receiver_id', params.receiverId)
  if (params.parentMessageId) query = query.eq('parent_message_id', params.parentMessageId)

  return query
}

export async function fetchCurrentUser(supabase: ReturnType<typeof createClient>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) throw new Error('No user found')
  return user
}

export async function fetchMessagesData({
  channelId,
  receiverId,
  parentMessageId,
  supabase
}: MessageQueryParams & {
  supabase: ReturnType<typeof createClient>
}) {
  if (!channelId && !receiverId && !parentMessageId) return []

  const query = buildMessageQuery(supabase, { channelId, receiverId, parentMessageId })
  const { data: messagesData, error: queryError } = await query

  if (queryError) throw queryError
  if (!messagesData) throw new Error('No data returned')

  return messagesData
} 
import { createClient } from '@/lib/supabase/client'
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import type { ChatClientFetchProps, QueryConfig } from '../types'

const supabase = createClient()

export function buildMessageQuery(supabase: ReturnType<typeof createClient>) {
  return supabase
    .from('messages')
    .select(`
      *,
      profiles:users!messages_user_id_fkey(
        id,
        username,
        profile_picture_url,
        status
      ),
      reactions:message_reactions(*),
      files:message_files(*)
    `)
}

export function configureQueryParams({
  currentUser,
  currentChannelId,
  currentDmUserId,
  parentMessageId,
  skipInitialFetch = false
}: ChatClientFetchProps): QueryConfig | null {
  if (skipInitialFetch && !parentMessageId && (currentChannelId || currentDmUserId)) {
    return null
  }

  let messageType: 'channels' | 'dms' | 'threads' = 'channels'
  let storeKey: string | number = ''
  let query = buildMessageQuery(supabase) as PostgrestFilterBuilder<any, any, any>

  if (parentMessageId) {
    query = query.eq('parent_message_id', parentMessageId)
    messageType = 'threads'
    storeKey = parentMessageId
  } else if (currentChannelId) {
    query = query.eq('channel_id', currentChannelId)
    messageType = 'channels'
    storeKey = currentChannelId
  } else if (currentDmUserId) {
    query = query
      .eq('message_type', 'direct')
      .or(`and(user_id.eq.${currentUser.id},receiver_id.eq.${currentDmUserId}),and(user_id.eq.${currentDmUserId},receiver_id.eq.${currentUser.id})`)
    messageType = 'dms'
    storeKey = currentDmUserId
  } else {
    return null
  }

  return { messageType, storeKey, query }
} 
import { createClient } from '@/app/_lib/supabase-server'
import type { DbMessage, MessageFile, MessageReaction } from '@/types/database'
import type { UiMessage } from '@/types/messages-ui'

// Types
interface BaseMessage extends Omit<UiMessage, 'thread_messages' | 'profiles'> {
  profiles: {
    id: string
    username: string
  }
  files?: MessageFile[]
  reactions?: Array<{
    emoji: string
    count: number
    reacted_by_me: boolean
  }>
}

interface DisplayMessage extends BaseMessage {
  thread_messages?: DisplayMessage[]
}

interface MessageWithJoins extends DbMessage {
  profiles: {
    id: string
    username: string | null
  } | null
  files: MessageFile[] | null
  reactions: MessageReaction[] | null
}

// Query Constants
const BASE_MESSAGE_QUERY = `
  *,
  profiles:users!messages_user_id_fkey(
    id,
    username
  ),
  files:message_files(*),
  reactions:message_reactions(*)
`

const THREAD_MESSAGE_QUERY = `
  *,
  user:users(*),
  reactions:message_reactions(*),
  files:message_files(*),
  mentions:message_mentions(*)
`

// Reaction Formatting
function groupReactionsByEmoji(reactions: MessageReaction[] | null): Map<string, Set<string>> {
  const reactionsByEmoji = new Map<string, Set<string>>()
  
  if (!reactions) return reactionsByEmoji

  reactions.forEach(reaction => {
    if (!reactionsByEmoji.has(reaction.emoji)) {
      reactionsByEmoji.set(reaction.emoji, new Set())
    }
    reactionsByEmoji.get(reaction.emoji)!.add(reaction.user_id)
  })

  return reactionsByEmoji
}

function formatReactions(reactions: MessageReaction[] | null): DisplayMessage['reactions'] {
  if (!reactions) return []
  
  const reactionsByEmoji = groupReactionsByEmoji(reactions)

  return Array.from(reactionsByEmoji.entries()).map(([emoji, users]) => ({
    emoji,
    count: users.size,
    reacted_by_me: false // We don't have currentUserId on server
  }))
}

// Message Formatting
function formatMessageForDisplay(message: MessageWithJoins): DisplayMessage {
  return {
    ...message,
    profiles: {
      id: message.profiles?.id || '',
      username: message.profiles?.username || 'Unknown'
    },
    reactions: formatReactions(message.reactions),
    files: message.files || [],
    thread_messages: [] // Initialize empty thread messages array
  }
}

// Thread Message Handling
async function fetchThreadMessages(messageIds: number[]) {
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

function groupThreadMessagesByParent(threadMessages: DbMessage[]): Record<number, DbMessage[]> {
  return threadMessages.reduce((acc, tm) => {
    if (!tm.parent_message_id) return acc
    if (!acc[tm.parent_message_id]) {
      acc[tm.parent_message_id] = []
    }
    acc[tm.parent_message_id].push(tm)
    return acc
  }, {} as Record<number, DbMessage[]>)
}

// Channel Messages
export async function getChannelMessages(channelId: number): Promise<DisplayMessage[]> {
  const supabase = await createClient()
  
  const { data: messages, error } = await supabase
    .from('messages')
    .select(BASE_MESSAGE_QUERY)
    .eq('channel_id', channelId)
    .order('inserted_at', { ascending: true })

  if (error) throw error
  if (!messages) return []

  return (messages as MessageWithJoins[]).map(message => formatMessageForDisplay(message))
}

// Direct Messages
async function fetchDirectMessages(userId: string, otherUserId: string) {
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

export async function getDirectMessages(userId: string, otherUserId: string): Promise<DbMessage[]> {
  const messages = await fetchDirectMessages(userId, otherUserId)

  if (!messages.length) return []

  // Fetch and attach thread messages
  const messageIds = messages.map(m => m.id)
  const threadMessages = await fetchThreadMessages(messageIds)
  const threadMessagesByParent = groupThreadMessagesByParent(threadMessages)

  // Attach thread messages to their parent messages
  return messages.map(message => ({
    ...message,
    thread_messages: threadMessagesByParent[message.id] || []
  }))
}

// Message Reactions
export async function getMessageReactions(messageId: number): Promise<MessageReaction[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('message_reactions')
    .select('*, user:users(*)')
    .eq('message_id', messageId)
    .order('inserted_at', { ascending: true })

  if (error) throw error
  return data || []
} 
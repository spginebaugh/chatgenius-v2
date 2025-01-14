import { createClient } from '@/app/_lib/supabase-server'
import type { DbMessage, MessageFile, MessageReaction } from '@/types/database'
import type { UiMessage } from '@/types/messages-ui'

// Base message type without thread_messages to avoid recursion
interface BaseMessage extends Omit<UiMessage, 'thread_messages' | 'profiles'> {
  profiles: {
    id: string
    username: string // We ensure this is never null when formatting
  }
  files?: MessageFile[]
  reactions?: Array<{
    emoji: string
    count: number
    reacted_by_me: boolean
  }>
}

// Message type with thread messages
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

// Format a message for display
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

function formatReactions(reactions: MessageReaction[] | null): DisplayMessage['reactions'] {
  if (!reactions) return []
  
  // Group reactions by emoji
  const reactionsByEmoji = new Map<string, Set<string>>()
  
  reactions.forEach(reaction => {
    if (!reactionsByEmoji.has(reaction.emoji)) {
      reactionsByEmoji.set(reaction.emoji, new Set())
    }
    reactionsByEmoji.get(reaction.emoji)!.add(reaction.user_id)
  })

  // Format reactions for display
  return Array.from(reactionsByEmoji.entries()).map(([emoji, users]) => ({
    emoji,
    count: users.size,
    reacted_by_me: false // We don't have currentUserId on server
  }))
}

export async function getChannelMessages(channelId: number): Promise<DisplayMessage[]> {
  const supabase = createClient()
  
  const { data: messages, error } = await supabase
    .from('messages')
    .select(`
      *,
      profiles:users!messages_user_id_fkey(
        id,
        username
      ),
      files:message_files(*),
      reactions:message_reactions(*)
    `)
    .eq('channel_id', channelId)
    .order('inserted_at', { ascending: true })

  if (error) throw error
  if (!messages) return []

  // Format messages for display
  return (messages as MessageWithJoins[]).map(message => formatMessageForDisplay(message))
}

// Get direct messages between users
export async function getDirectMessages(userId: string, otherUserId: string): Promise<DbMessage[]> {
  const supabase = await createClient()
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select(`
      *,
      user:users(*),
      reactions:message_reactions(*),
      files:message_files(*),
      mentions:message_mentions(*)
    `)
    .eq('message_type', 'direct')
    .or(`and(user_id.eq.${userId},receiver_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .order('inserted_at', { ascending: false })
    .limit(50)

  if (messagesError) throw messagesError

  // Fetch thread messages separately if there are any messages
  if (messages?.length) {
    const messageIds = messages.map(m => m.id)
    const { data: threadMessages, error: threadError } = await supabase
      .from('messages')
      .select(`
        *,
        user:users(*),
        reactions:message_reactions(*),
        files:message_files(*),
        mentions:message_mentions(*)
      `)
      .in('parent_message_id', messageIds)
      .eq('message_type', 'thread')
      .order('inserted_at', { ascending: true })

    if (threadError) throw threadError

    // Group thread messages by parent message
    const threadMessagesByParent = threadMessages?.reduce((acc, tm) => {
      if (!tm.parent_message_id) return acc
      if (!acc[tm.parent_message_id]) {
        acc[tm.parent_message_id] = []
      }
      acc[tm.parent_message_id].push(tm)
      return acc
    }, {} as Record<number, DbMessage[]>)

    // Attach thread messages to their parent messages
    return messages.map(message => ({
      ...message,
      thread_messages: threadMessagesByParent[message.id] || []
    }))
  }

  return messages || []
}

// Get reactions for a message
export async function getMessageReactions(messageId: number): Promise<MessageReaction[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('message_reactions')
    .select('*, user:users(*)')
    .eq('message_id', messageId)
    .order('inserted_at', { ascending: true })

  if (error) throw error
  return data
} 
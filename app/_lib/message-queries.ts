import { createClient } from '@/app/_lib/supabase-server'
import type { DbMessage, MessageFile, MessageReaction, UserStatus } from '@/types/database'
import type { UiMessage, UiMessageReaction } from '@/types/messages-ui'

/**
 * Intermediate type representing a message with its joined relations from the database.
 * Extends DbMessage with explicitly nullable joined data.
 * - profiles: null when join fails or user deleted
 * - files: null when not yet loaded
 * - reactions: null when not yet loaded
 */
interface MessageWithJoins extends DbMessage {
  profiles: {
    id: string
    username: string | null
    profile_picture_url: string | null
    status: UserStatus | null
  } | null // null when join fails or user deleted
  files: MessageFile[] | null // null when not loaded
  reactions: MessageReaction[] | null // null when not loaded
}

// Type without thread_messages to avoid recursion in certain operations
type NoThreadMessage = Omit<UiMessage, 'thread_messages'>

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
  profiles:users!messages_user_id_fkey(
    id,
    username
  ),
  files:message_files(*),
  reactions:message_reactions(*),
  mentions:message_mentions(*)
`

// Reaction Formatting
function groupReactionsByEmoji(reactions: MessageReaction[]): Map<string, Set<string>> {
  const reactionsByEmoji = new Map<string, Set<string>>()
  
  if (!reactions?.length) return reactionsByEmoji

  reactions.forEach(reaction => {
    if (!reactionsByEmoji.has(reaction.emoji)) {
      reactionsByEmoji.set(reaction.emoji, new Set())
    }
    reactionsByEmoji.get(reaction.emoji)!.add(reaction.user_id)
  })

  return reactionsByEmoji
}

function formatReactions(reactions: MessageReaction[], currentUserId?: string): UiMessageReaction[] {
  if (!reactions?.length) return []
  
  const reactionsByEmoji = groupReactionsByEmoji(reactions)

  return Array.from(reactionsByEmoji.entries()).map(([emoji, users]) => ({
    emoji,
    count: users.size,
    reacted_by_me: currentUserId ? users.has(currentUserId) : false
  }))
}

// Message Formatting
/**
 * Formats a database message with joins into a UI-friendly format.
 * Handles null values and provides defaults for UI rendering.
 */
async function formatMessageForDisplay(message: MessageWithJoins, currentUserId?: string): Promise<UiMessage> {
  const supabase = await createClient()

  return {
    id: message.id,
    message: message.message || '', // Convert null to empty string
    message_type: message.message_type,
    user_id: message.user_id,
    channel_id: message.channel_id,
    receiver_id: message.receiver_id,
    parent_message_id: message.parent_message_id,
    thread_count: message.thread_count,
    inserted_at: message.inserted_at,
    // Format profile with defaults
    profiles: {
      id: message.profiles?.id || message.user_id,
      username: message.profiles?.username || 'Unknown',
      profile_picture_url: message.profiles?.profile_picture_url || null,
      status: message.profiles?.status || 'OFFLINE'
    },
    // Convert null arrays to empty arrays
    reactions: formatReactions(message.reactions || [], currentUserId),
    files: (message.files || []).map(file => ({
      url: file.file_url,  // Use the stored URL directly
      type: file.file_type,
      name: file.file_url.split('/').pop() || 'file'
    })),
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

export async function getDirectMessages(userId: string, otherUserId: string): Promise<UiMessage[]> {
  const messages = await fetchDirectMessages(userId, otherUserId)

  if (!messages.length) return []

  // Fetch and attach thread messages
  const messageIds = messages.map(m => m.id)
  const threadMessages = await fetchThreadMessages(messageIds)
  const threadMessagesByParent = groupThreadMessagesByParent(threadMessages)

  // Format messages and attach thread messages
  const formattedMessages = await Promise.all(
    messages.map(async message => {
      const formattedMessage = await formatMessageForDisplay(message as MessageWithJoins)
      formattedMessage.thread_messages = await Promise.all(
        (threadMessagesByParent[message.id] || []).map(tm => 
          formatMessageForDisplay(tm as MessageWithJoins)
        )
      )
      return formattedMessage
    })
  )

  return formattedMessages
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
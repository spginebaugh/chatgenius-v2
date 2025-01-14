import type { UiMessage, UiMessageReaction } from '@/types/messages-ui'
import type { MessageReaction } from '@/types/database'
import type { MessageStoreType } from './types'

// Key Generation
export function getStoreKey(type: MessageStoreType, id: string | number): string {
  return `${type}:${id.toString()}`
}

// Message Formatting
interface DefaultProfile {
  id: string
  username: string
}

function createDefaultProfile(userId: string): DefaultProfile {
  return {
    id: userId,
    username: 'Unknown'
  }
}

function formatMessageDefaults(message: UiMessage): UiMessage {
  return {
    ...message,
    reactions: message.reactions || [],
    thread_messages: message.thread_messages || [],
    profiles: message.profiles || createDefaultProfile(message.user_id)
  }
}

export function formatMessageForStore(message: UiMessage): UiMessage {
  return formatMessageDefaults(message)
}

// Message Merging
function mergeMessageProperties(existingMsg: UiMessage, newMsg: UiMessage): UiMessage {
  return {
    ...existingMsg,
    ...newMsg,
    reactions: newMsg.reactions?.length ? newMsg.reactions : existingMsg.reactions,
    thread_messages: newMsg.thread_messages?.length ? newMsg.thread_messages : existingMsg.thread_messages,
    profiles: newMsg.profiles || existingMsg.profiles
  }
}

function createMessageMap(messages: UiMessage[]): Map<number, UiMessage> {
  return new Map(messages.map(msg => [msg.id, msg]))
}

function sortMessagesByTimestamp(messages: UiMessage[]): UiMessage[] {
  return messages.sort((a, b) => 
    new Date(a.inserted_at).valueOf() - new Date(b.inserted_at).valueOf()
  )
}

function mergeNewMessages(
  existingMessages: UiMessage[],
  newMessages: UiMessage[],
  existingMessageMap: Map<number, UiMessage>
): UiMessage[] {
  return newMessages.reduce((acc: UiMessage[], newMsg) => {
    const existingMsg = existingMessageMap.get(newMsg.id)
    if (existingMsg) {
      acc.push(mergeMessageProperties(existingMsg, newMsg))
    } else {
      acc.push(formatMessageDefaults(newMsg))
    }
    return acc
  }, [...existingMessages.filter(msg => !newMessages.some(newMsg => newMsg.id === msg.id))])
}

export function mergeMessages(existingMessages: UiMessage[], newMessages: UiMessage[]): UiMessage[] {
  // Preserve existing messages if new messages array is empty
  if (newMessages.length === 0 && existingMessages.length > 0) {
    return existingMessages
  }

  const existingMessageMap = createMessageMap(existingMessages)
  const mergedMessages = mergeNewMessages(existingMessages, newMessages, existingMessageMap)
  return sortMessagesByTimestamp(mergedMessages)
}

// Reaction Formatting
interface ReactionGroup {
  emoji: string
  count: number
  reacted_by_me: boolean
}

function createEmptyReactionGroup(emoji: string): ReactionGroup {
  return {
    emoji,
    count: 0,
    reacted_by_me: false
  }
}

function updateReactionGroup(
  group: ReactionGroup,
  userId: string,
  currentUserId: string
): ReactionGroup {
  return {
    ...group,
    count: group.count + 1,
    reacted_by_me: group.reacted_by_me || userId === currentUserId
  }
}

function groupReactionsByEmoji(
  reactions: MessageReaction[],
  currentUserId: string
): Map<string, ReactionGroup> {
  return reactions.reduce((acc, reaction) => {
    const key = reaction.emoji
    if (!acc.has(key)) {
      acc.set(key, createEmptyReactionGroup(key))
    }
    const current = acc.get(key)!
    acc.set(key, updateReactionGroup(current, reaction.user_id, currentUserId))
    return acc
  }, new Map<string, ReactionGroup>())
}

export function formatReactions(reactions: MessageReaction[], currentUserId: string): UiMessageReaction[] {
  const reactionGroups = groupReactionsByEmoji(reactions, currentUserId)
  return Array.from(reactionGroups.values())
} 
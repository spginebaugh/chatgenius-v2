"use client"

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { handleChannelMessage, handleDirectMessage } from '@/app/actions/messages'
import { useMessagesStore } from '@/lib/stores/messages'
import type { Message } from '@/lib/stores/messages'

interface ViewData {
  id: string
  type: 'channel' | 'dm'
}

interface MessageProfile {
  id: string
  username: string
}

interface ReactionType {
  emoji: string
  count: number
  reacted_by_me: boolean
}

interface ThreadMessage {
  id: string
  message: string
  inserted_at: string
  profiles: MessageProfile
}

interface DatabaseUser {
  id: string
  username: string
}

interface BaseMessage {
  message_id: string
  message: string | null
  inserted_at: string
  users?: DatabaseUser | DatabaseUser[]
  user_id?: string
  sender_id?: string
  sender?: DatabaseUser
  receiver?: DatabaseUser
}

interface UseMessagesProps {
  channelId?: string
  userId?: string
  viewType: 'channel' | 'dm'
  currentViewData?: ViewData
}

interface UseMessagesResult {
  messages: Message[]
  loading: boolean
  error: string | null
  sendMessage: (message: string, files?: Array<{ url: string, type: string, name: string }>) => Promise<void>
}

interface FetchMessagesProps {
  channelId?: string
  userId?: string
  viewType: 'channel' | 'dm'
  currentViewData?: ViewData
}

async function fetchMessages({ 
  channelId, 
  userId, 
  viewType, 
  currentViewData 
}: FetchMessagesProps): Promise<Message[]> {
  const supabase = createClient()

  // Fetch base messages first
  let baseQuery
  if (viewType === 'channel' && channelId) {
    console.log('Fetching channel messages for channel:', channelId)
    baseQuery = supabase
      .from('channel_messages')
      .select(`
        message_id,
        message,
        inserted_at,
        channel_id,
        user_id,
        users (
          id,
          username
        )
      `)
      .eq('channel_id', channelId)
      .order('inserted_at', { ascending: true })
  } else if (viewType === 'dm' && userId && currentViewData?.id) {
    console.log('Fetching DMs between users:', userId, 'and', currentViewData.id)
    baseQuery = supabase
      .from('direct_messages')
      .select(`
        message_id,
        message,
        inserted_at,
        sender_id,
        receiver_id,
        sender:users!direct_messages_sender_id_fkey (
          id,
          username
        ),
        receiver:users!direct_messages_receiver_id_fkey (
          id,
          username
        )
      `)
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${currentViewData.id}),and(sender_id.eq.${currentViewData.id},receiver_id.eq.${userId})`)
      .order('inserted_at', { ascending: true })
  } else {
    console.warn('Invalid view configuration:', { viewType, channelId, userId, currentViewData })
    return []
  }

  console.log('Executing base query...')
  const { data: baseMessages, error: baseError } = await baseQuery

  if (baseError) {
    console.error('Base query error:', JSON.stringify(baseError, null, 2))
    throw baseError
  }

  if (!baseMessages?.length) {
    console.log('No messages found')
    return []
  }

  console.log('Found', baseMessages.length, 'messages, fetching related data...')

  // Fetch thread messages for all base messages
  const messageIds = baseMessages.map(m => m.message_id)
  const { data: threadMessages, error: threadError } = await supabase
    .from('thread_messages')
    .select(`
      message_id,
      message,
      inserted_at,
      parent_id,
      parent_type,
      user_id,
      users (
        id,
        username
      )
    `)
    .in('parent_id', messageIds)
    .eq('parent_type', viewType === 'channel' ? 'channel_message' : 'direct_message')

  if (threadError) {
    console.error('Thread messages query error:', JSON.stringify(threadError, null, 2))
  }

  // Fetch reactions for all base messages and thread messages
  const { data: reactions, error: reactionsError } = await supabase
    .from('emoji_reactions')
    .select('*')
    .or(
      `and(parent_id.in.(${messageIds.join(',')}),parent_type.eq.${viewType === 'channel' ? 'channel_message' : 'direct_message'}),` +
      `and(parent_id.in.(${threadMessages?.map(t => t.message_id).join(',')}),parent_type.eq.thread_message)`
    )

  if (reactionsError) {
    console.error('Reactions query error:', JSON.stringify(reactionsError, null, 2))
  }

  // Process and combine the data
  console.log('Processing messages with related data...')
  return (baseMessages as BaseMessage[]).map(message => {
    const messageThreads = threadMessages?.filter(t => t.parent_id === message.message_id) || []
    const messageReactions = reactions?.filter(r => 
      r.parent_id === message.message_id && 
      r.parent_type === (viewType === 'channel' ? 'channel_message' : 'direct_message')
    ) || []

    // Get the user ID and username based on message type
    const userId = 'user_id' in message ? message.user_id : message.sender_id
    let username = 'Unknown'
    
    if ('users' in message) {
      // Channel message
      const user = Array.isArray(message.users) ? message.users[0] : message.users
      username = user?.username || 'Unknown'
    } else {
      // Direct message
      const isSender = message.sender_id === userId
      username = (isSender ? message.sender?.username : message.receiver?.username) || 'Unknown'
    }

    return {
      id: message.message_id.toString(),
      message: message.message || '',
      inserted_at: message.inserted_at,
      profiles: {
        id: userId || '',
        username
      },
      thread_messages: messageThreads.map(thread => {
        const threadUser = Array.isArray(thread.users) ? thread.users[0] : thread.users
        const threadReactions = reactions?.filter(r => 
          r.parent_id === thread.message_id && 
          r.parent_type === 'thread_message'
        ) || []
        
        return {
          id: thread.message_id.toString(),
          message: thread.message || '',
          inserted_at: thread.inserted_at,
          profiles: {
            id: thread.user_id || '',
            username: threadUser?.username || 'Unknown'
          },
          reactions: threadReactions.reduce((acc: ReactionType[], reaction) => {
            const existingReaction = acc.find(r => r.emoji === reaction.emoji)
            if (existingReaction) {
              existingReaction.count++
              if (reaction.user_id === userId) {
                existingReaction.reacted_by_me = true
              }
            } else {
              acc.push({
                emoji: reaction.emoji,
                count: 1,
                reacted_by_me: reaction.user_id === userId
              })
            }
            return acc
          }, [])
        }
      }),
      reactions: messageReactions.reduce((acc: ReactionType[], reaction) => {
        const existingReaction = acc.find(r => r.emoji === reaction.emoji)
        if (existingReaction) {
          existingReaction.count++
          if (reaction.user_id === userId) {
            existingReaction.reacted_by_me = true
          }
        } else {
          acc.push({
            emoji: reaction.emoji,
            count: 1,
            reacted_by_me: reaction.user_id === userId
          })
        }
        return acc
      }, [])
    }
  })
}

export function useMessages({ 
  channelId, 
  userId, 
  viewType, 
  currentViewData 
}: UseMessagesProps): UseMessagesResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchKey, setLastFetchKey] = useState<string>('')
  const { messages: storeMessages, setMessages: setStoreMessages } = useMessagesStore()
  
  const key = viewType === 'channel' ? channelId : userId
  const messages = key ? storeMessages[key] || [] : []

  useEffect(() => {
    const fetchKey = `${viewType}-${channelId || userId}`
    if (fetchKey === lastFetchKey) return // Prevent duplicate fetches
    
    const loadMessages = async () => {
      if (!channelId && !userId) return
      
      setLoading(true)
      setError(null)
      
      try {
        const fetchedMessages = await fetchMessages({ channelId, userId, viewType, currentViewData })
        if (key) {
          setStoreMessages(key, fetchedMessages)
        }
        setLastFetchKey(fetchKey)
      } catch (err) {
        console.error('Error loading messages:', err)
        setError(err instanceof Error ? err.message : 'Failed to load messages')
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [channelId, userId, viewType, currentViewData, key, setStoreMessages])

  const sendMessage = async (message: string, files?: Array<{ url: string, type: string, name: string }>) => {
    try {
      if (viewType === 'channel' && channelId) {
        await handleChannelMessage({
          channelId,
          message,
          files
        })
      } else if (viewType === 'dm' && currentViewData?.id) {
        await handleDirectMessage({
          receiverId: currentViewData.id,
          message,
          files
        })
      }
    } catch (err) {
      console.error('Error sending message:', err)
      throw err
    }
  }

  return { messages, loading, error, sendMessage }
} 
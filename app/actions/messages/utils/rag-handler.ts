import { queryDocuments } from '@/lib/rag/rag-service'
import { createMessageData } from './create-message'
import { insertMessage, getMessage } from './db-operations'

const RAG_BOT_USER_ID = '00000000-0000-0000-0000-000000000000'

export async function handleRagQuery(params: {
  message: string
  userId: string
  channelId?: number | null
  receiverId?: string | null
  parentMessageId?: number | null
}) {
  const { message, userId, channelId, receiverId, parentMessageId } = params

  // First store the user's query
  const userMessageData = createMessageData({
    message,
    userId,
    channelId: channelId || null,
    receiverId: receiverId || null,
    parentMessageId: parentMessageId || null
  })
  const userMessage = await insertMessage(userMessageData)

  // Then handle RAG query
  const response = await queryDocuments(message, userId)
  
  // Create message with RAG response
  const responseMessageData = createMessageData({
    message: response.content,
    userId: RAG_BOT_USER_ID,
    channelId: userMessage.channel_id,
    receiverId: userMessage.message_type === 'direct' ? userMessage.user_id : null,
    parentMessageId: userMessage.message_type === 'thread' ? userMessage.parent_message_id : 
                    userMessage.message_type === 'direct' ? userMessage.message_id : 
                    null,
    messageType: userMessage.message_type
  })

  // Insert the response message
  return await insertMessage(responseMessageData)
} 
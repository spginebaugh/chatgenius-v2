import { queryDocuments } from '@/lib/rag/rag-service'
import { createMessageData } from './create-message'
import { insertMessage } from './db-operations'

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
    channelId,
    receiverId,
    parentMessageId
  })
  const userMessage = await insertMessage(userMessageData)

  // Then handle RAG query
  const response = await queryDocuments(message, userId)
  
  // Create message with RAG response
  const responseMessageData = createMessageData({
    message: response.content,
    userId: process.env.RAG_BOT_USER_ID || userId, // Use RAG bot user if configured
    channelId,
    receiverId,
    parentMessageId
  })

  // Set message type to 'rag'
  responseMessageData.message_type = 'rag'

  // Insert the response message
  return await insertMessage(responseMessageData)
} 
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
    channelId,
    receiverId,
    parentMessageId
  })
  const userMessage = await insertMessage(userMessageData)

  // Then handle RAG query
  const response = await queryDocuments(message, userId)
  
  // Get parent message to determine message type
  const parentMessage = parentMessageId ? await getMessage(parentMessageId) : null
  
  // Create message with RAG response
  const responseMessageData = createMessageData({
    message: response.content,
    userId: RAG_BOT_USER_ID,
    channelId,
    receiverId,
    parentMessageId
  })

  // Use parent message type if available, otherwise use the same type as user message
  responseMessageData.message_type = parentMessage?.message_type || userMessageData.message_type

  // Insert the response message
  return await insertMessage(responseMessageData)
} 
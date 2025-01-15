'use server'

import { requireAuth } from '@/app/_lib/auth'
import type { HandleMessageProps } from './types'
import { createMessageData } from './utils/create-message'
import { insertMessage, formatMessageResponse, refreshMessageWithFiles } from './utils/db-operations'
import { processFileAttachment } from './utils/file-handler'
import { handleRagQuery } from './utils/rag-handler'

export async function handleMessage({ 
  message, 
  files, 
  channelId, 
  receiverId, 
  parentMessageId,
  isRagQuery = false
}: HandleMessageProps) {
  const user = await requireAuth({ throwOnMissingProfile: true })
  
  if (isRagQuery) {
    const responseMessage = await handleRagQuery({
      message,
      userId: user.id,
      channelId,
      receiverId,
      parentMessageId
    })
    return formatMessageResponse(responseMessage)
  }

  // Handle regular message
  const messageData = createMessageData({
    message,
    userId: user.id,
    channelId,
    receiverId,
    parentMessageId
  })

  const insertedMessage = await insertMessage(messageData)

  if (files?.length) {
    try {
      await Promise.all(
        files.map(file => processFileAttachment({ 
          messageId: insertedMessage.id, 
          file 
        }))
      )
      const updatedMessage = await refreshMessageWithFiles(insertedMessage.id)
      return formatMessageResponse(updatedMessage)
    } catch (error) {
      console.error('Error handling file attachments:', error)
      throw error
    }
  }

  return formatMessageResponse(insertedMessage)
} 
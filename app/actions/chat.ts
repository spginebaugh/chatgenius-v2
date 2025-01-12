"use server"

import { requireAuth } from '@/lib/utils/auth'
import { sendChannelMessage, sendDirectMessage, sendThreadMessage } from '@/lib/utils/message-helpers'
import type { FileAttachment } from '@/lib/utils/message-helpers'

interface SendMessageProps {
  channelId: string
  message: string
  files?: FileAttachment[]
}

interface SendDirectMessageProps {
  receiverId: string
  message: string
  files?: FileAttachment[]
}

interface SendThreadMessageProps {
  parentId: string
  parentType: 'channel_message' | 'direct_message'
  message: string
  files?: FileAttachment[]
}

export async function sendMessage({ channelId, message, files }: SendMessageProps) {
  const user = await requireAuth({ throwOnMissingProfile: true })
  
  await sendChannelMessage({
    channelId,
    message,
    files,
    userId: user.id
  })
}

export async function sendDM({ receiverId, message, files }: SendDirectMessageProps) {
  const user = await requireAuth({ throwOnMissingProfile: true })

  await sendDirectMessage({
    receiverId,
    message,
    files,
    userId: user.id
  })
}

export async function sendThreadReply({ parentId, parentType, message, files }: SendThreadMessageProps) {
  const user = await requireAuth({ throwOnMissingProfile: true })

  await sendThreadMessage({
    parentId: parseInt(parentId),
    parentType,
    message,
    files,
    userId: user.id
  })
} 
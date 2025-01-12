'use server'

import { revalidatePath } from "next/cache"
import { requireAuth } from '@/lib/utils/auth'
import { sendChannelMessage, sendDirectMessage, sendThreadMessage } from '@/lib/utils/message-helpers'
import { createClient } from '@/utils/supabase/server'
import type { FileAttachment } from '@/lib/utils/message-helpers'

interface HandleChannelMessageProps {
  channelId: string
  message: string
  files?: FileAttachment[]
}

interface HandleDirectMessageProps {
  receiverId: string
  message: string
  files?: FileAttachment[]
}

interface HandleThreadMessageProps {
  parentId: string
  parentType: 'channel_message' | 'direct_message'
  message: string
  files?: FileAttachment[]
}

export async function handleChannelMessage({ channelId, message, files }: HandleChannelMessageProps) {
  const user = await requireAuth({ throwOnMissingProfile: true })
  
  await sendChannelMessage({
    channelId,
    message,
    files,
    userId: user.id
  })

  revalidatePath('/channels/[id]', 'page')
}

export async function handleDirectMessage({ receiverId, message, files }: HandleDirectMessageProps) {
  const user = await requireAuth({ throwOnMissingProfile: true })

  await sendDirectMessage({
    receiverId,
    message,
    files,
    userId: user.id
  })

  revalidatePath('/dm/[id]', 'page')
}

export async function handleThreadMessage({ parentId, parentType, message, files }: HandleThreadMessageProps) {
  const user = await requireAuth({ throwOnMissingProfile: true })

  await sendThreadMessage({
    parentId: parseInt(parentId),
    parentType,
    message,
    files,
    userId: user.id
  })

  revalidatePath('/channels/[id]', 'page')
  revalidatePath('/dm/[id]', 'page')
}

export async function addEmojiReaction({
  parentId,
  parentType,
  emoji
}: {
  parentId: string
  parentType: 'channel_message' | 'direct_message' | 'thread_message'
  emoji: string
}) {
  const user = await requireAuth()

  // Use RPC for the toggle operation
  const supabase = await createClient()
  const { error } = await supabase.rpc('toggle_reaction', {
    p_message_id: parseInt(parentId),
    p_message_type: parentType,
    p_emoji: emoji,
    p_user_id: user.id
  })

  if (error) throw error
} 
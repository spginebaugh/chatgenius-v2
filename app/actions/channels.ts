"use server"

import { createClient } from '@/app/_lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/app/_lib/auth'
import { insertRecord, updateRecord, deleteRecord, selectRecords } from '@/app/_lib/supabase'
import type { Channel } from '@/types/database'

interface CreateChannelProps {
  name: string
}

interface UpdateChannelProps {
  channelId: number
  name: string
}

interface DeleteChannelProps {
  channelId: number
}

export async function createChannel({ name }: CreateChannelProps) {
  const user = await requireAuth({ throwOnMissingProfile: true })
  const slug = name.toLowerCase().replace(/\s+/g, '-')

  await insertRecord<Channel>({
    table: 'channels',
    data: {
      slug,
      created_by: user.id,
      inserted_at: new Date().toISOString()
    },
    options: {
      revalidatePath: '/channel/[id]',
      errorMap: {
        NOT_FOUND: {
          message: 'Failed to create channel',
          status: 500
        }
      }
    }
  })
}

export async function updateChannel({ channelId, name }: UpdateChannelProps) {
  await requireAuth({ throwOnMissingProfile: true })

  await updateRecord<Channel>({
    table: 'channels',
    data: {
      slug: name.toLowerCase().replace(/\s+/g, '-')
    },
    match: { id: channelId },
    options: {
      revalidatePath: '/channel/[id]',
      errorMap: {
        NOT_FOUND: {
          message: 'Channel not found',
          status: 404
        }
      }
    }
  })
}

export async function deleteChannel({ channelId }: DeleteChannelProps) {
  await requireAuth({ throwOnMissingProfile: true })

  await deleteRecord<Channel>({
    table: 'channels',
    match: { id: channelId },
    options: {
      revalidatePath: '/channel/[id]',
      errorMap: {
        NOT_FOUND: {
          message: 'Channel not found',
          status: 404
        }
      }
    }
  })
}

export async function ensureDefaultChannels() {
  const user = await requireAuth({ throwOnMissingProfile: true })
  const supabase = await createClient()

  // Check for general channel
  const generalChannel = await selectRecords<Channel>({
    table: 'channels',
    match: { slug: 'general' },
    options: {
      errorMap: {
        NOT_FOUND: {
          message: 'General channel not found',
          status: 404
        }
      }
    }
  }).catch(() => null)

  if (!generalChannel) {
    await insertRecord<Channel>({
      table: 'channels',
      data: {
        slug: 'general',
        created_by: user.id,
        inserted_at: new Date().toISOString()
      },
      options: {
        revalidatePath: '/channel/[id]',
        errorMap: {
          NOT_FOUND: {
            message: 'Failed to create general channel',
            status: 500
          }
        }
      }
    })
  }

  // Check for random channel
  const randomChannel = await selectRecords<Channel>({
    table: 'channels',
    match: { slug: 'random' },
    options: {
      errorMap: {
        NOT_FOUND: {
          message: 'Random channel not found',
          status: 404
        }
      }
    }
  }).catch(() => null)

  if (!randomChannel) {
    await insertRecord<Channel>({
      table: 'channels',
      data: {
        slug: 'random',
        created_by: user.id,
        inserted_at: new Date().toISOString()
      },
      options: {
        revalidatePath: '/channel/[id]',
        errorMap: {
          NOT_FOUND: {
            message: 'Failed to create random channel',
            status: 500
          }
        }
      }
    })
  }
} 
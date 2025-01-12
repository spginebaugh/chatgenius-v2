"use server"

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { requireAuth } from '@/lib/utils/auth'
import { insertRecord, updateRecord, deleteRecord } from '@/lib/utils/supabase-helpers'
import type { Channel } from '@/types/database'

interface CreateChannelProps {
  name: string
  description?: string
}

interface UpdateChannelProps {
  channelId: string
  name?: string
  description?: string
}

interface DeleteChannelProps {
  channelId: string
}

export async function createChannel({ name, description }: CreateChannelProps) {
  const user = await requireAuth({ throwOnMissingProfile: true })

  const slug = name.toLowerCase().replace(/\s+/g, '-')

  await insertRecord<Channel>({
    table: 'channels',
    data: {
      slug,
      created_by: user.id
    },
    options: {
      revalidatePath: '/channels/[id]'
    }
  })
}

export async function updateChannel({ channelId, name, description }: UpdateChannelProps) {
  await requireAuth({ throwOnMissingProfile: true })

  const updates: Partial<Channel> = {}
  if (name) {
    updates.slug = name.toLowerCase().replace(/\s+/g, '-')
  }

  await updateRecord<Channel>({
    table: 'channels',
    data: updates,
    match: {
      channel_id: parseInt(channelId)
    },
    options: {
      revalidatePath: '/channels/[id]'
    }
  })
}

export async function deleteChannel({ channelId }: DeleteChannelProps) {
  await requireAuth({ throwOnMissingProfile: true })

  await deleteRecord<Channel>({
    table: 'channels',
    match: {
      channel_id: parseInt(channelId)
    },
    options: {
      revalidatePath: '/channels/[id]'
    }
  })
}

export async function ensureDefaultChannels() {
  const user = await requireAuth({ throwOnMissingProfile: true })
  const supabase = await createClient()

  // Create general channel if it doesn't exist
  const { count: generalExists } = await supabase
    .from('channels')
    .select('*', { count: 'exact', head: true })
    .eq('slug', 'general')

  if (!generalExists) {
    await insertRecord<Channel>({
      table: 'channels',
      data: {
        slug: 'general',
        created_by: user.id
      },
      options: {
        revalidatePath: '/channels/[id]'
      }
    })
  }

  // Create random channel if it doesn't exist
  const { count: randomExists } = await supabase
    .from('channels')
    .select('*', { count: 'exact', head: true })
    .eq('slug', 'random')

  if (!randomExists) {
    await insertRecord<Channel>({
      table: 'channels',
      data: {
        slug: 'random',
        created_by: user.id
      },
      options: {
        revalidatePath: '/channels/[id]'
      }
    })
  }
} 
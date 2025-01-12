'use server'

import { requireAuth } from '@/lib/utils/auth'
import { updateRecord } from '@/lib/utils/supabase-helpers'
import type { User } from '@/types/database'

interface UpdateUserProfileProps {
  username?: string
  profile_picture_url?: string
  bio?: string
}

interface UpdateUserStatusProps {
  status: 'ONLINE' | 'OFFLINE'
}

export async function updateUserProfile({ username, profile_picture_url, bio }: UpdateUserProfileProps) {
  const user = await requireAuth({ throwOnMissingProfile: true })

  await updateRecord<User>({
    table: 'users',
    data: {
      username,
      profile_picture_url,
      bio
    },
    match: {
      id: user.id
    },
    options: {
      revalidatePath: '/settings/profile'
    }
  })
}

export async function updateUserStatus({ status }: UpdateUserStatusProps) {
  const user = await requireAuth({ throwOnMissingProfile: true })

  await updateRecord<User>({
    table: 'users',
    data: {
      status,
      last_active_at: new Date().toISOString()
    },
    match: {
      id: user.id
    },
    options: {
      revalidatePath: '/channels/[id]'
    }
  })
} 
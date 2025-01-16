'use server'

import { createClient } from '@/app/_lib/supabase-server'
import { requireAuth } from '@/app/_lib/auth'
import { revalidatePath } from 'next/cache'
import { updateRecord } from '@/app/_lib/supabase'
import type { User, UserStatus } from '@/types/database'

interface UpdateUserProfileProps {
  username?: string
  profile_picture_url?: string
  bio?: string
}

interface UpdateUserStatusProps {
  status: UserStatus
}

export async function updateUserProfile({ username, profile_picture_url, bio }: UpdateUserProfileProps) {
  const user = await requireAuth({ throwOnMissingProfile: true })

  await updateRecord<User>({
    table: 'users',
    data: {
      username,
      profile_picture_url,
      bio,
      last_active_at: new Date().toISOString()
    },
    match: {
      user_id: user.id
    },
    options: {
      revalidatePath: '/settings/profile',
      errorMap: {
        NOT_FOUND: {
          message: 'User profile not found',
          status: 404
        }
      }
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
      user_id: user.id
    },
    options: {
      revalidatePath: '/channel/[id]',
      errorMap: {
        NOT_FOUND: {
          message: 'User profile not found',
          status: 404
        }
      }
    }
  })
} 
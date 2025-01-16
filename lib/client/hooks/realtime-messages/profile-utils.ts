import type { UserStatus } from '@/types/database'
import type { UiProfile } from '@/types/messages-ui'

export function createUiProfile(profile: UiProfile | null, userId: string): UiProfile {
  return {
    user_id: profile?.user_id || userId,
    username: profile?.username || 'Unknown',
    profile_picture_url: profile?.profile_picture_url || null,
    status: (profile?.status as UserStatus) || 'OFFLINE'
  }
} 
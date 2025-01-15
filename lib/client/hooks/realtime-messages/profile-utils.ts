import type { UserStatus } from '@/types/database'
import type { UiProfile } from '@/types/messages-ui'

export function createUiProfile(profile: any | null, userId: string): UiProfile {
  return {
    id: profile?.id || userId,
    username: profile?.username || 'Unknown User',
    profile_picture_url: profile?.profile_picture_url || null,
    status: (profile?.status as UserStatus) || 'OFFLINE'
  }
} 
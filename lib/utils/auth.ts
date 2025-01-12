import { createClient } from '@/utils/supabase/server'
import { FetchError } from '@/lib/fetching/helpers'
import type { User } from '@/types/database'

interface RequireAuthOptions {
  throwOnMissingProfile?: boolean
}

interface GetOptionalUserOptions {
  throwProfileErrors?: boolean
}

interface CheckPermissionProps {
  resourceType: 'channel' | 'message' | 'thread'
  resourceId: string
  requiredRole?: 'owner' | 'member' | 'admin'
}

/**
 * Get the authenticated user or throw an error if not authenticated
 */
export async function requireAuth({ 
  throwOnMissingProfile = true 
}: RequireAuthOptions = {}): Promise<User> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError) {
    throw new FetchError(
      'Authentication failed',
      'AUTH_ERROR',
      401
    )
  }

  if (!user) {
    throw new FetchError(
      'Authentication required',
      'AUTH_REQUIRED',
      401
    )
  }

  // Get the full user profile
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || (!profile && throwOnMissingProfile)) {
    throw new FetchError(
      'Failed to fetch user profile',
      'PROFILE_ERROR',
      500
    )
  }

  return profile
}

/**
 * Get the authenticated user or return null if not authenticated
 */
export async function getOptionalUser({ 
  throwProfileErrors = false 
}: GetOptionalUserOptions = {}): Promise<User | null> {
  try {
    return await requireAuth({ throwOnMissingProfile: throwProfileErrors })
  } catch (error) {
    if (error instanceof FetchError && error.code === 'AUTH_REQUIRED') {
      return null
    }
    throw error
  }
}

/**
 * Check if the current user has permission to access a resource
 */
export async function checkPermission({ 
  resourceType,
  resourceId,
  requiredRole = 'owner'
}: CheckPermissionProps): Promise<boolean> {
  const user = await requireAuth()
  const supabase = await createClient()

  switch (resourceType) {
    case 'channel': {
      const { data } = await supabase
        .from('channels')
        .select('created_by')
        .eq('id', resourceId)
        .single()
      
      return data?.created_by === user.id
    }

    case 'message': {
      const { data } = await supabase
        .from('channel_messages')
        .select('user_id')
        .eq('id', resourceId)
        .single()
      
      return data?.user_id === user.id
    }

    case 'thread': {
      const { data } = await supabase
        .from('thread_messages')
        .select('user_id')
        .eq('id', resourceId)
        .single()
      
      return data?.user_id === user.id
    }

    default:
      return false
  }
} 
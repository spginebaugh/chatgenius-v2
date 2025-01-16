import { createClient } from '@/app/_lib/supabase-server'
import { FetchError } from '@/app/_lib/fetch-helpers'
import type { User } from '@supabase/supabase-js'

interface RequireAuthOptions {
  throwOnMissingProfile?: boolean
}

interface GetOptionalUserOptions {
  throwProfileErrors?: boolean
}

interface CheckPermissionProps {
  resourceType: 'channel' | 'message'
  resourceId: string | number
  requiredRole?: 'admin' | 'moderator'
}

/**
 * Get the authenticated user or throw an error if not authenticated
 */
export async function requireAuth({ throwOnMissingProfile = false } = {}): Promise<User> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new FetchError('Authentication required', 'AUTH_REQUIRED', 401)
  }

  if (throwOnMissingProfile) {
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      throw new FetchError('User profile not found', 'PROFILE_NOT_FOUND', 404)
    }
  }

  return user
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
  requiredRole = 'admin'
}: CheckPermissionProps): Promise<boolean> {
  const user = await requireAuth()
  const supabase = await createClient()

  // First check if user has the required role
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!userRole || userRole.role !== requiredRole) {
    return false
  }

  switch (resourceType) {
    case 'channel': {
      const { data } = await supabase
        .from('channels')
        .select('created_by')
        .eq('channel_id', resourceId)
        .single()
      
      return data?.created_by === user.id
    }

    case 'message': {
      const { data } = await supabase
        .from('messages')
        .select('user_id')
        .eq('message_id', resourceId)
        .single()
      
      return data?.user_id === user.id
    }

    default:
      return false
  }
}

export async function checkAuth(): Promise<User> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new FetchError('Authentication required', 'AUTH_REQUIRED', 401)
  }
  
  return user
} 
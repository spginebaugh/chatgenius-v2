import { createClient } from '@/app/_lib/supabase-server'
import { handleUserCreation } from './lib/user-management'
import { getDefaultChannelId } from './lib/channel-utils'
import { parseCallbackParams, createRedirectResponse } from './lib/route-utils'

export async function GET(request: Request) {
  const { code, origin, redirectTo } = parseCallbackParams(request)

  if (!code) {
    console.error('No code provided in callback')
    return createRedirectResponse(origin, '/auth/error?message=no_code')
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (authError) {
      console.error('Auth error:', authError)
      return createRedirectResponse(origin, '/auth/error?message=auth_error')
    }
    
    if (!user) {
      console.error('No user returned from auth')
      return createRedirectResponse(origin, '/auth/error?message=no_user')
    }

    console.log('Auth callback - User:', user.id)
    await handleUserCreation(user)

    // Handle redirect
    if (redirectTo) {
      return createRedirectResponse(origin, redirectTo)
    }

    // Default redirect to first channel
    const channelId = await getDefaultChannelId()
    return createRedirectResponse(origin, `/channel/${channelId}`)
  } catch (error) {
    console.error('Unexpected error in auth callback:', error)
    return createRedirectResponse(origin, '/auth/error?message=unexpected_error')
  }
}

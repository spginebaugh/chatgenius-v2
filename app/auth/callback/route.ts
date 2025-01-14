import { createClient } from "@/app/_lib/supabase-server";
import { insertRecord, selectRecords } from '@/app/_lib/supabase';
import { NextResponse } from "next/server";
import type { User, Channel } from '@/types/database';

// Types
interface AuthCallbackParams {
  code: string | null
  origin: string
  redirectTo: string | null
}

interface UserCreationData {
  id: string
  email?: string | null
}

// Helper Functions
function parseCallbackParams(request: Request): AuthCallbackParams {
  const requestUrl = new URL(request.url)
  return {
    code: requestUrl.searchParams.get("code"),
    origin: requestUrl.origin,
    redirectTo: requestUrl.searchParams.get("redirect_to")
  }
}

function generateUsername(user: UserCreationData): string {
  return user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`
}

function createUserData(user: UserCreationData): Omit<User, 'bio' | 'profile_picture_url' | 'last_active_at'> {
  return {
    id: user.id,
    username: generateUsername(user),
    status: 'OFFLINE' as const,
    inserted_at: new Date().toISOString()
  }
}

async function handleUserCreation(user: UserCreationData): Promise<void> {
  try {
    // Try to get existing user
    await selectRecords<User>({
      table: 'users',
      match: { id: user.id }
    })
    console.log('Existing user found:', user.id)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not found')) {
      await createNewUser(user)
    } else {
      console.error('Error checking user:', error)
      throw error // Re-throw unexpected errors
    }
  }
}

async function createNewUser(user: UserCreationData): Promise<void> {
  const userData = createUserData(user)
  const newUser: User = {
    ...userData,
    bio: null,
    profile_picture_url: null,
    last_active_at: new Date().toISOString()
  }
  
  console.log('Creating user:', newUser)
  
  await insertRecord<User>({
    table: 'users',
    data: newUser
  })
  
  console.log('User created successfully')
}

async function getDefaultChannelId(): Promise<number> {
  try {
    const channels = await selectRecords<Channel>({
      table: 'channels',
      select: 'id',
      options: {
        errorMap: {
          NOT_FOUND: { message: 'No channels found', status: 404 }
        }
      }
    })
    return channels?.[0]?.id || 1
  } catch (error) {
    console.error('Error fetching default channel:', error)
    return 1 // Fallback to channel 1
  }
}

function createRedirectResponse(origin: string, path: string): NextResponse {
  return NextResponse.redirect(`${origin}${path}`)
}

// Main Handler
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

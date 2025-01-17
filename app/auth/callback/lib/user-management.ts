import { insertRecord, selectRecords } from '@/app/_lib/supabase'
import type { User } from '../types/auth'
import type { UserCreationData } from '../types/auth'

function generateUsername(user: UserCreationData): string {
  return user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`
}

function createUserData(user: UserCreationData): Omit<User, 'bio' | 'profile_picture_url' | 'last_active_at'> {
  return {
    user_id: user.id,
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
      match: { user_id: user.id }
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

export { handleUserCreation } 
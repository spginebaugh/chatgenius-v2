'use server'

import { requireAuth } from '@/app/_lib/auth'
import { updateRecord, selectRecords } from '@/app/_lib/supabase'
import type { User } from '@/types/database'
import type { User as AuthUser } from '@supabase/supabase-js'

interface ValidationResult {
  isValid: boolean
  error?: string
}

function validateUsername(username: string): ValidationResult {
  if (!username) {
    return { isValid: false, error: 'Username is required' }
  }
  
  if (username.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters' }
  }
  
  if (username.length > 20) {
    return { isValid: false, error: 'Username must be less than 20 characters' }
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' }
  }
  
  return { isValid: true }
}

async function checkUsernameAvailability(username: string, currentUserId: string): Promise<ValidationResult> {
  const existingUser = await selectRecords<User>({
    table: 'users',
    select: 'user_id',
    match: { username },
    options: {
      errorMap: {
        NOT_FOUND: { message: 'No user found', status: 404 }
      }
    }
  })

  if (existingUser?.length && existingUser[0]?.user_id !== currentUserId) {
    return { isValid: false, error: 'Username is already taken' }
  }

  return { isValid: true }
}

async function performUsernameUpdate(userId: string, username: string): Promise<void> {
  await updateRecord<User>({
    table: 'users',
    data: { 
      username: username.trim(),
      last_active_at: new Date().toISOString()
    },
    match: { user_id: userId },
    options: {
      revalidatePath: '/',
      errorMap: {
        NOT_FOUND: {
          message: 'User profile not found',
          status: 404
        }
      }
    }
  })
}

export async function updateUsername({ username }: { username: string }): Promise<{ error?: string }> {
  try {
    const authUser = await requireAuth()

    // Validate username format
    const validationResult = validateUsername(username)
    if (!validationResult.isValid) {
      return { error: validationResult.error }
    }

    // Check username availability
    const availabilityResult = await checkUsernameAvailability(username, authUser.id)
    if (!availabilityResult.isValid) {
      return { error: availabilityResult.error }
    }

    // Update username
    await performUsernameUpdate(authUser.id, username)

    return {}
  } catch (error) {
    console.error('Error updating username:', error)
    return { error: error instanceof Error ? error.message : "Failed to update username" }
  }
} 
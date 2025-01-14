'use server'

import { createClient } from "@/app/_lib/supabase-server"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/app/_lib/auth"
import { updateRecord, selectRecords } from '@/app/_lib/supabase'
import type { User } from '@/types/database'
import { redirect } from "next/navigation"

interface ValidationResult {
  isValid: boolean
  error?: string
}

function validateUsername(username: string): ValidationResult {
  if (!username?.trim()) {
    return { isValid: false, error: "Username is required" }
  }

  if (username.length < 3) {
    return { isValid: false, error: "Username must be at least 3 characters long" }
  }

  if (username.length > 30) {
    return { isValid: false, error: "Username must be at most 30 characters long" }
  }

  return { isValid: true }
}

async function checkUsernameAvailability(username: string, currentUserId: string): Promise<ValidationResult> {
  const existingUser = await selectRecords<User>({
    table: 'users',
    match: { username: username.trim() },
    options: {
      errorMap: {
        NOT_FOUND: { message: 'No user found', status: 404 }
      }
    }
  }).catch(() => null)

  if (existingUser?.length && existingUser[0]?.id !== currentUserId) {
    return { isValid: false, error: "Username is already taken" }
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
    match: { id: userId },
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
    const user = await requireAuth()

    // Validate username format
    const validationResult = validateUsername(username)
    if (!validationResult.isValid) {
      return { error: validationResult.error }
    }

    // Check username availability
    const availabilityResult = await checkUsernameAvailability(username, user.id)
    if (!availabilityResult.isValid) {
      return { error: availabilityResult.error }
    }

    // Update username
    await performUsernameUpdate(user.id, username)

    return {}
  } catch (error) {
    console.error('Error updating username:', error)
    return { error: error instanceof Error ? error.message : "Failed to update username" }
  }
} 
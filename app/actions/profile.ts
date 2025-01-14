'use server'

import { createClient } from "@/app/_lib/supabase-server"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/app/_lib/auth"
import { updateRecord, selectRecords } from '@/app/_lib/supabase-helpers'
import type { User } from '@/types/database'
import { redirect } from "next/navigation"

export async function updateUsername({ username }: { username: string }): Promise<{ error?: string }> {
  try {
    const user = await requireAuth()
    console.log('Current user:', user)

    // Validate username
    if (!username?.trim()) {
      throw new Error("Username is required")
    }

    if (username.length < 3) {
      throw new Error("Username must be at least 3 characters long")
    }

    if (username.length > 30) {
      throw new Error("Username must be at most 30 characters long")
    }

    // Check if username is already taken
    console.log('Checking for existing username:', username)
    const existingUser = await selectRecords<User>({
      table: 'users',
      match: { username: username.trim() },
      options: {
        errorMap: {
          NOT_FOUND: { message: 'No user found', status: 404 }
        }
      }
    }).catch(() => null)

    console.log('Existing user check result:', existingUser)
    console.log('Existing user ID:', existingUser?.[0]?.id)
    console.log('Current user ID:', user.id)

    if (existingUser?.length && existingUser[0]?.id !== user.id) {
      console.log('Username taken - existing:', existingUser[0]?.id, 'current:', user.id)
      throw new Error("Username is already taken")
    }

    // Update username
    console.log('Updating username for user:', user.id)
    await updateRecord<User>({
      table: 'users',
      data: { 
        username: username.trim(),
        last_active_at: new Date().toISOString()
      },
      match: { id: user.id },
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

    return {}
  } catch (error) {
    console.error('Error updating username:', error)
    return { error: error instanceof Error ? error.message : "Failed to update username" }
  }
} 
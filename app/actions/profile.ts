'use server'

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/utils/auth"
import { createClient } from "@/utils/supabase/server"

export async function updateUsername({ username }: { username: string }) {
  const user = await requireAuth()
  const supabase = await createClient()

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
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .single()

  if (existingUser) {
    throw new Error("Username is already taken")
  }

  // Update username
  const { error } = await supabase
    .from("users")
    .update({ username })
    .eq("id", user.id)

  if (error) throw error

  revalidatePath('/', 'layout')
} 
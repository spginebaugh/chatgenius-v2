import { createClient } from '@/app/_lib/supabase-server'
import type { User } from '@/types/database'

// Get all users
export async function getUsers(): Promise<User[]> {
  const supabase = await createClient()
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('username', { ascending: true })

  if (error) throw error
  return users || []
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return profile
} 
"use client"

import { useEffect, useState } from 'react'
import type { User } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { selectRecords } from '@/lib/supabase/query-helpers'

interface UseUsersResult {
  users: User[]
  isLoading: boolean
  error: Error | null
}

export function useUsers(initialUsers: User[] = []): UseUsersResult {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true)
        const fetchedUsers = await selectRecords<User>({
          table: 'users',
          select: '*'
        })
        setUsers(fetchedUsers)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch users'))
      } finally {
        setIsLoading(false)
      }
    }

    if (initialUsers.length === 0) {
      fetchUsers()
    }
  }, [initialUsers])

  return {
    users,
    isLoading,
    error
  }
} 
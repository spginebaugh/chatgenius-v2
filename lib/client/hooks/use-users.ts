"use client"

import { useEffect, useState, useRef, useMemo } from 'react'
import type { User } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { selectRecords } from '@/lib/supabase/query-helpers'

interface UseUsersResult {
  users: User[]
  isLoading: boolean
  error: Error | null
}

// Stable comparison function for User objects
function compareUsers(a: User[], b: User[]): boolean {
  if (a.length !== b.length) return false
  
  return a.every((userA, index) => {
    const userB = b[index]
    return userA.id === userB.id &&
      userA.username === userB.username &&
      userA.bio === userB.bio &&
      userA.profile_picture_url === userB.profile_picture_url &&
      userA.status === userB.status
  })
}

export function useUsers(initialUsers: User[] = []): UseUsersResult {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Track if we've done the initial fetch
  const hasInitializedRef = useRef(false)
  
  // Store previous initialUsers for comparison
  const prevInitialUsersRef = useRef<User[]>(initialUsers)

  // Memoize the comparison function
  const hasInitialUsersChanged = useMemo(() => 
    !compareUsers(prevInitialUsersRef.current, initialUsers)
  , [initialUsers])

  useEffect(() => {
    if (hasInitialUsersChanged) {
      prevInitialUsersRef.current = initialUsers
      setUsers(initialUsers)
      // Reset initialization flag if we get new initial users
      hasInitializedRef.current = initialUsers.length > 0
    }

    const fetchUsers = async () => {
      // Don't fetch if we already have users from props
      if (hasInitializedRef.current) return
      
      try {
        setIsLoading(true)
        const fetchedUsers = await selectRecords<User>({
          table: 'users',
          select: '*'
        })
        setUsers(fetchedUsers)
        hasInitializedRef.current = true
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch users'))
      } finally {
        setIsLoading(false)
      }
    }

    // Only fetch if we haven't initialized and don't have initial users
    if (!hasInitializedRef.current && initialUsers.length === 0) {
      fetchUsers()
    }
  }, [hasInitialUsersChanged]) // Only depend on the memoized comparison result

  return {
    users,
    isLoading,
    error
  }
} 
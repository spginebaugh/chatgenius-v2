"use client"

import { useCallback, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useUsersStore } from '@/lib/stores/users'
import { updateUserProfile, updateUserStatus } from '@/app/actions/users'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { User } from '@/types/database'

interface UseUsersResult {
  users: Record<string, User>
  currentUser: User | null
  onlineUsers: Set<string>
  isLoading: boolean
  error: string | null
  updateProfile: (updates: { username?: string, bio?: string, profilePictureUrl?: string }) => Promise<void>
  updateStatus: (status: 'ONLINE' | 'OFFLINE') => Promise<void>
  getUserById: (id: string) => User | undefined
  getOnlineStatus: (id: string) => boolean
}

export function useUsers(): UseUsersResult {
  const { 
    users, 
    currentUser, 
    onlineUsers, 
    isLoading, 
    error, 
    setUsers, 
    setCurrentUser, 
    updateUserStatus: updateStoreUserStatus,
    setError 
  } = useUsersStore()

  useEffect(() => {
    let subscription: RealtimeChannel | null = null
    const supabase = createClient()

    const setupSubscription = () => {
      subscription = supabase
        .channel('users')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles'
          },
          async (payload) => {
            if (payload.eventType === 'UPDATE') {
              const { data: updatedUser } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', payload.new.id)
                .single()

              if (updatedUser) {
                // Update users list
                setUsers([{
                  ...users[updatedUser.id],
                  ...updatedUser
                }])

                // Update current user if it's them
                if (currentUser?.id === updatedUser.id) {
                  setCurrentUser(updatedUser)
                }

                // Update online status
                if (updatedUser.status === 'ONLINE') {
                  updateStoreUserStatus(updatedUser.id, 'ONLINE')
                } else {
                  updateStoreUserStatus(updatedUser.id, 'OFFLINE')
                }
              }
            }
          }
        )
        .subscribe()
    }

    setupSubscription()

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [users, currentUser, setUsers, setCurrentUser, updateStoreUserStatus])

  const handleUpdateProfile = useCallback(async (updates: { username?: string, bio?: string, profilePictureUrl?: string }) => {
    try {
      await updateUserProfile(updates)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update profile')
    }
  }, [setError])

  const handleUpdateStatus = useCallback(async (status: 'ONLINE' | 'OFFLINE') => {
    try {
      await updateUserStatus({ status })
      if (currentUser) {
        updateStoreUserStatus(currentUser.id, status)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update status')
    }
  }, [currentUser, updateStoreUserStatus, setError])

  const getUserById = useCallback((id: string) => {
    return users[id]
  }, [users])

  const getOnlineStatus = useCallback((id: string) => {
    return onlineUsers.has(id)
  }, [onlineUsers])

  return {
    users,
    currentUser,
    onlineUsers,
    isLoading,
    error,
    updateProfile: handleUpdateProfile,
    updateStatus: handleUpdateStatus,
    getUserById,
    getOnlineStatus
  }
} 
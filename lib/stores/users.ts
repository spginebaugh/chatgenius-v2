"use client"

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { User } from '@/types/database'

interface UsersState {
  users: Record<string, User>
  currentUser: User | null
  onlineUsers: Set<string>
  isLoading: boolean
  error: string | null

  // Actions
  setUsers: (users: User[]) => void
  setCurrentUser: (user: User | null) => void
  updateUserStatus: (userId: string, status: 'ONLINE' | 'OFFLINE') => void
  updateUserProfile: (userId: string, updates: Partial<User>) => void
  setError: (error: string | null) => void
  setLoading: (isLoading: boolean) => void
  reset: () => void
}

const initialState: Pick<UsersState, 'users' | 'currentUser' | 'onlineUsers' | 'isLoading' | 'error'> = {
  users: {},
  currentUser: null,
  onlineUsers: new Set(),
  isLoading: false,
  error: null,
}

export const useUsersStore = create<UsersState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        // Set all users
        setUsers: (users) =>
          set(state => ({
            users: users.reduce((acc, user) => {
              acc[user.id] = user
              return acc
            }, {} as Record<string, User>)
          })),

        // Set current user
        setCurrentUser: (user) =>
          set({ currentUser: user }),

        // Update user status
        updateUserStatus: (userId, status) =>
          set(state => {
            // Ensure onlineUsers is always a Set
            const onlineUsers = new Set(Array.from(state.onlineUsers))
            if (status === 'ONLINE') {
              onlineUsers.add(userId)
            } else {
              onlineUsers.delete(userId)
            }

            return {
              users: {
                ...state.users,
                [userId]: {
                  ...state.users[userId],
                  status,
                  last_active_at: new Date().toISOString()
                }
              },
              onlineUsers
            }
          }),

        // Update user profile
        updateUserProfile: (userId, updates) =>
          set(state => ({
            users: {
              ...state.users,
              [userId]: {
                ...state.users[userId],
                ...updates
              }
            }
          })),

        // Error handling
        setError: (error) => set({ error }),

        // Loading state
        setLoading: (isLoading) => set({ isLoading }),

        // Reset store
        reset: () => set({
          ...initialState,
          onlineUsers: new Set() // Ensure Set is properly initialized on reset
        })
      }),
      {
        name: 'users-store',
        storage: {
          getItem: (name): { state: UsersState } | null => {
            const str = localStorage.getItem(name)
            if (!str) return null
            const data = JSON.parse(str)
            return {
              ...data,
              state: {
                ...data.state,
                onlineUsers: new Set(data.state.onlineUsers)
              }
            }
          },
          setItem: (name: string, value: { state: UsersState }): void => {
            const data = {
              ...value,
              state: {
                ...value.state,
                onlineUsers: Array.from(value.state.onlineUsers)
              }
            }
            localStorage.setItem(name, JSON.stringify(data))
          },
          removeItem: (name: string): void => localStorage.removeItem(name)
        }
      }
    )
  )
) 
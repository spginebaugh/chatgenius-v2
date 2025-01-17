"use client"

import { create } from 'zustand'
import type { User } from '@/types/database'

interface UsersState {
  users: User[]
  currentUser: User | null
  setUsers: (users: User[] | ((currentUsers: User[]) => User[])) => void
  setCurrentUser: (user: User) => void
}

export const useUsersStore = create<UsersState>((set) => ({
  users: [],
  currentUser: null,
  setUsers: (users) => set((state) => ({
    users: typeof users === 'function' ? users(state.users) : users
  })),
  setCurrentUser: (user) => set({ currentUser: user })
})) 
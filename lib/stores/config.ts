import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// Create a type-safe store configuration
export const createStore = <T extends object>(
  initialState: T,
  name: string,
  storage = true
) => {
  return create<T>()(
    devtools(
      persist(
        () => ({
          ...initialState
        }),
        {
          name,
          // Only enable storage in production or when explicitly requested
          skipHydration: process.env.NODE_ENV === 'development' && !storage,
        }
      )
    )
  )
}

// Type helper for store state
export type StoreState<T> = T & {
  // Add common store properties here if needed
}

// Type helper for store actions
export type StoreActions<T> = {
  // Add common action types here if needed
  reset: () => void
} 
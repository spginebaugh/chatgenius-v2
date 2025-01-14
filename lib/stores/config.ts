import { create } from 'zustand'
import { devtools, persist, PersistStorage, StorageValue } from 'zustand/middleware'

// Create a type-safe store configuration
export const createStore = <T extends object>(
  initialState: T,
  name: string,
  storage = true
) => {
  const customStorage: PersistStorage<T> | undefined = typeof window !== 'undefined'
    ? {
        getItem: (name): StorageValue<T> | null => {
          const str = sessionStorage.getItem(name)
          if (!str) return null
          try {
            const data = JSON.parse(str)
            // Clear old data if it's from a previous session
            if (data.state && data.version !== process.env.NEXT_PUBLIC_APP_VERSION) {
              sessionStorage.removeItem(name)
              return null
            }
            return data
          } catch {
            return null
          }
        },
        setItem: (name, value) => {
          const data = {
            ...value,
            version: process.env.NEXT_PUBLIC_APP_VERSION
          }
          sessionStorage.setItem(name, JSON.stringify(data))
        },
        removeItem: (name) => sessionStorage.removeItem(name)
      }
    : undefined

  return create<T>()(
    devtools(
      persist(
        () => ({
          ...initialState
        }),
        {
          name,
          storage: storage ? customStorage : undefined
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
import { create } from 'zustand'
import { devtools, persist, PersistStorage, StorageValue } from 'zustand/middleware'

// Types
interface StorageData<T> {
  state: T
  version?: string
}

interface CustomStorageOptions {
  storage?: boolean
  version?: string
}

// Storage Helpers
function isValidVersion(data: StorageData<unknown>): boolean {
  return !data.version || data.version === process.env.NEXT_PUBLIC_APP_VERSION
}

function parseStorageData<T>(str: string | null): StorageData<T> | null {
  if (!str) return null
  
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

function createStorageData<T>(value: StorageValue<T>): StorageData<T> {
  return {
    state: value.state,
    version: process.env.NEXT_PUBLIC_APP_VERSION
  }
}

// Custom Storage Implementation
function createCustomStorage<T extends object>(): PersistStorage<T> | undefined {
  if (typeof window === 'undefined') return undefined

  return {
    getItem: (name): StorageValue<T> | null => {
      const data = parseStorageData<T>(sessionStorage.getItem(name))
      
      if (!data || !isValidVersion(data)) {
        sessionStorage.removeItem(name)
        return null
      }
      
      return { state: data.state, version: 1 }
    },
    setItem: (name, value) => {
      const data = createStorageData(value)
      sessionStorage.setItem(name, JSON.stringify(data))
    },
    removeItem: (name) => sessionStorage.removeItem(name)
  }
}

// Store Creation
function createPersistConfig<T extends object>(name: string, storage?: boolean) {
  return {
    name,
    storage: storage ? createCustomStorage<T>() : undefined
  }
}

/**
 * Creates a type-safe Zustand store with optional persistence
 */
export function createStore<T extends object>(
  initialState: T,
  name: string,
  storage = true
) {
  return create<T>()(
    devtools(
      persist(
        () => ({ ...initialState }),
        createPersistConfig<T>(name, storage)
      )
    )
  )
}

// Type Helpers
export type StoreState<T> = T

export interface StoreActions<T> {
  // Add common action types here if needed
  reset: () => void
} 
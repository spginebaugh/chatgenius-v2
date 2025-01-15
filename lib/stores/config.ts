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

function safeJSONParse<T>(str: string | null): T | null {
  if (!str) return null
  
  try {
    return JSON.parse(str)
  } catch {
    console.warn('[Storage] Failed to parse stored data:', { str })
    return null
  }
}

function safeJSONStringify(data: unknown): string {
  try {
    // Use a replacer function to handle circular references
    const seen = new WeakSet()
    return JSON.stringify(data, (key, value) => {
      // Handle non-object values
      if (typeof value !== 'object' || value === null) {
        return value
      }
      
      // Handle circular references
      if (seen.has(value)) {
        console.warn('[Storage] Circular reference detected:', { key })
        return '[Circular]'
      }
      seen.add(value)
      
      return value
    })
  } catch (error) {
    console.error('[Storage] Failed to stringify data:', error)
    return JSON.stringify({ error: 'Failed to serialize data' })
  }
}

function parseStorageData<T>(str: string | null): StorageData<T> | null {
  return safeJSONParse<StorageData<T>>(str)
}

function createStorageData<T>(value: StorageValue<T>): string {
  // Create storage data object with only serializable data
  const data: StorageData<T> = {
    state: value.state,
    version: process.env.NEXT_PUBLIC_APP_VERSION
  }
  
  return safeJSONStringify(data)
}

// Custom Storage Implementation
function createCustomStorage<T extends object>(): PersistStorage<T> | undefined {
  if (typeof window === 'undefined') return undefined

  return {
    getItem: (name): StorageValue<T> | null => {
      try {
        const data = parseStorageData<T>(sessionStorage.getItem(name))
        
        if (!data || !isValidVersion(data)) {
          sessionStorage.removeItem(name)
          return null
        }
        
        return { state: data.state, version: 1 }
      } catch (error) {
        console.error('[Storage] Failed to get item:', error)
        return null
      }
    },
    setItem: (name, value) => {
      try {
        const serializedData = createStorageData(value)
        sessionStorage.setItem(name, serializedData)
      } catch (error) {
        console.error('[Storage] Failed to set item:', error)
      }
    },
    removeItem: (name) => {
      try {
        sessionStorage.removeItem(name)
      } catch (error) {
        console.error('[Storage] Failed to remove item:', error)
      }
    }
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
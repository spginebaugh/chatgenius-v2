import type { User, Channel } from '@/types/database'

export interface AuthCallbackParams {
  code: string | null
  origin: string
  redirectTo: string | null
}

export interface UserCreationData {
  id: string
  email?: string | null
}

export type { User, Channel } 
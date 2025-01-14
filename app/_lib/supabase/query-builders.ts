import { revalidatePath as nextRevalidatePath } from 'next/cache'
import type { DbRecord } from './types'

export function buildMatchConditions<T extends DbRecord>(query: any, match: Partial<T>) {
  let result = query
  Object.entries(match).forEach(([key, value]) => {
    if (value !== undefined) {
      result = result.eq(key, value)
    }
  })
  return result
}

export function handleRevalidation(revalidatePath?: string) {
  if (revalidatePath) {
    nextRevalidatePath(revalidatePath)
  }
} 
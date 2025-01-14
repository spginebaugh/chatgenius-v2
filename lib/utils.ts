import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Encodes parameters and redirects to a URL with those parameters
 */
export function encodedRedirect(
  type: 'error' | 'success' | 'info',
  path: string,
  message?: string
): string {
  const params = new URLSearchParams()
  if (message) {
    params.set(type, message)
  }
  const queryString = params.toString()
  return `${path}${queryString ? '?' + queryString : ''}`
}

export function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString)
    return true
  } catch {
    return false
  }
}
